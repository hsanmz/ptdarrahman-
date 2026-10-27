"""
Unit tests for CBT (Computer Based Test) module using standard library unittest.
Verifies:
  - CSV template generation
  - CSV parsing with standard commas & semicolon delimiters
  - JSON parsing
  - Strict MCQ validation (rejection of essay, missing options, invalid answer key)
  - Auto-grading calculations & token formatting
"""

import unittest

try:
    from fastapi import HTTPException
except ImportError:

    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail


from src.modules.cbt.service import CBTService


class TestCBTModule(unittest.TestCase):
    def test_generate_csv_template(self):
        csv_text = CBTService.generate_csv_template("akademik")
        self.assertIn("Pertanyaan", csv_text)
        self.assertIn("Pilihan A", csv_text)
        self.assertIn("Kunci Jawaban", csv_text)
        self.assertIn("Poin", csv_text)

    def test_parse_valid_csv(self):
        csv_content = (
            b"No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,Kunci "
            b"Jawaban,Poin\n"
            b"1,Berapa 10 + 20?,10,20,30,40,50,C,10\n"
            b"2,Siapa penemu lampu?,Newton,Edison,Tesla,Einstein,,B,10\n"
        )

        parsed = CBTService.parse_and_validate_file(csv_content, "soal_akademik.csv")
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["question_number"], 1)
        self.assertEqual(parsed[0]["answer_key"], "C")
        self.assertEqual(parsed[0]["points"], 10.0)
        self.assertEqual(parsed[0]["options"]["C"], "30")
        self.assertEqual(parsed[1]["answer_key"], "B")
        self.assertEqual(parsed[1]["points"], 10.0)

    def test_parse_valid_csv_with_semicolon(self):
        # Format exported by Indonesian Excel
        csv_content = (
            "No;Pertanyaan;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E;Kunci "
            "Jawaban;Poin\n"
            "1;Hasil dari 5 x 5 adalah;10;15;20;25;30;D;5\n"
        ).encode("utf-8-sig")

        parsed = CBTService.parse_and_validate_file(csv_content, "soal.csv")
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["options"]["D"], "25")
        self.assertEqual(parsed[0]["answer_key"], "D")
        self.assertEqual(parsed[0]["points"], 5.0)

    def test_parse_valid_json(self):
        json_content = b"""
        [
            {
                "question_text": "Apa warna langit siang hari yang cerah?",
                "options": {
                    "A": "Merah",
                    "B": "Biru",
                    "C": "Hijau",
                    "D": "Kuning"
                },
                "answer_key": "B",
                "points": 5
            }
        ]
        """
        parsed = CBTService.parse_and_validate_file(json_content, "soal.json")
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["answer_key"], "B")
        self.assertEqual(parsed[0]["options"]["B"], "Biru")

    def test_reject_non_mcq_missing_options(self):
        # Missing option D
        csv_content = (
            b"No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Kunci "
            b"Jawaban,Poin\n"
            b"1,Ini soal esai tanpa opsi D,Pilihan A,Pilihan B,Pilihan C,,A,10\n"
        )

        with self.assertRaises(HTTPException) as ctx:
            CBTService.parse_and_validate_file(csv_content, "soal_gagal.csv")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Pilihan D kosong", ctx.exception.detail)

    def test_reject_invalid_answer_key(self):
        # Answer key is 'Z' which does not exist
        csv_content = (
            b"No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Kunci "
            b"Jawaban,Poin\n"
            b"1,Pertanyaan satu,Opt A,Opt B,Opt C,Opt D,Z,10\n"
        )

        with self.assertRaises(HTTPException) as ctx:
            CBTService.parse_and_validate_file(csv_content, "soal_invalid_key.csv")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Kunci jawaban 'Z' tidak valid", ctx.exception.detail)

    def test_generate_access_token_format(self):
        tok_acad = CBTService.generate_access_token("akademik")
        self.assertTrue(tok_acad.startswith("AKAD-"))
        self.assertEqual(len(tok_acad), 9)

        tok_psik = CBTService.generate_access_token("psikologi")
        self.assertTrue(tok_psik.startswith("PSIK-"))
        self.assertEqual(len(tok_psik), 9)

    def test_reject_oversized_file(self):
        big_content = (
            b"No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,"
            b"Kunci Jawaban,Poin\n" + b"a" * (6 * 1024 * 1024)
        )
        with self.assertRaises(HTTPException) as ctx:
            CBTService.parse_and_validate_file(big_content, "soal.csv")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("terlalu besar", ctx.exception.detail)

    def test_reject_xlsx_upload(self):
        with self.assertRaises(HTTPException) as ctx:
            CBTService.parse_and_validate_file(b"PK\x03\x04", "soal_rapor.xlsx")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("xlsx", ctx.exception.detail)

    def test_reject_too_many_questions(self):
        header = (
            "No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,"
            "Kunci Jawaban,Poin\n"
        )
        rows = "".join(f"{i},Soal ke-{i},a,b,c,d,A,1\n" for i in range(1, 510))
        with self.assertRaises(HTTPException) as ctx:
            CBTService.parse_and_validate_file(
                (header + rows).encode("utf-8"), "soal.csv"
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("batas maksimal", ctx.exception.detail)

    def test_fetch_url_rejects_non_google_host(self):
        # Badan asing & bukan HTTPS ditolak sebelum ada call jaringan
        bad_urls = [
            "http://intranet.local/data.csv",
            "https://evil.example.com/soal.csv",
            "ftp://docs.google.com/x.csv",
        ]
        for bad_url in bad_urls:
            with self.assertRaises(HTTPException) as ctx:
                CBTService.fetch_questions_from_url(bad_url)
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("Tautan tidak didukung", ctx.exception.detail)

    def test_fetch_url_rejects_google_forms(self):
        with self.assertRaises(HTTPException) as ctx:
            CBTService.fetch_questions_from_url(
                "https://docs.google.com/forms/d/e/1FAIpQLSf-xxx/viewform?embedded=true"
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Google Forms", ctx.exception.detail)

    def test_fetch_url_rejects_google_docs(self):
        with self.assertRaises(HTTPException) as ctx:
            CBTService.fetch_questions_from_url(
                "https://docs.google.com/document/d/1abcxyz/edit"
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Google Sheets", ctx.exception.detail)

    def test_normalize_options_missing_d(self):
        from src.modules.cbt.schemas import BankOptionInput

        options = [
            BankOptionInput(option_key="A", option_text="a"),
            BankOptionInput(option_key="B", option_text="b"),
            BankOptionInput(option_key="C", option_text="c"),
        ]
        with self.assertRaises(HTTPException) as ctx:
            CBTService._normalize_question_options(options, "A")
        self.assertIn("4 atau 5", ctx.exception.detail)

    def test_normalize_options_duplicate_key(self):
        from src.modules.cbt.schemas import BankOptionInput

        options = [
            BankOptionInput(option_key="A", option_text="a"),
            BankOptionInput(option_key="A", option_text="duplikat"),
            BankOptionInput(option_key="C", option_text="c"),
            BankOptionInput(option_key="D", option_text="d"),
        ]
        with self.assertRaises(HTTPException) as ctx:
            CBTService._normalize_question_options(options, "A")
        self.assertIn("lebih dari sekali", ctx.exception.detail)

    def test_normalize_options_answer_key_mismatch(self):
        from src.modules.cbt.schemas import BankOptionInput

        options = [
            BankOptionInput(option_key="A", option_text="a"),
            BankOptionInput(option_key="B", option_text="b"),
            BankOptionInput(option_key="C", option_text="c"),
            BankOptionInput(option_key="D", option_text="d"),
        ]
        with self.assertRaises(HTTPException) as ctx:
            CBTService._normalize_question_options(options, "E")
        self.assertIn("tidak cocok", ctx.exception.detail)

    def test_normalize_options_valid(self):
        from src.modules.cbt.schemas import BankOptionInput

        options = [
            BankOptionInput(option_key="A", option_text="a"),
            BankOptionInput(option_key="B", option_text="b"),
            BankOptionInput(option_key="C", option_text="c"),
            BankOptionInput(option_key="D", option_text="d"),
            BankOptionInput(option_key="E", option_text="e"),
        ]
        result = CBTService._normalize_question_options(options, "C")
        self.assertEqual(result["C"], "c")
        self.assertEqual(len(result), 5)


if __name__ == "__main__":
    unittest.main()
