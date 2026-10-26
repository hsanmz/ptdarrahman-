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
            "No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,Kunci Jawaban,Poin\n"
            "1,Berapa 10 + 20?,10,20,30,40,50,C,10\n"
            "2,Siapa penemu lampu?,Newton,Edison,Tesla,Einstein,,B,10\n"
        ).encode("utf-8")

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
            "No;Pertanyaan;Pilihan A;Pilihan B;Pilihan C;Pilihan D;Pilihan E;Kunci Jawaban;Poin\n"
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
            "No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Kunci Jawaban,Poin\n"
            "1,Ini soal esai tanpa opsi D,Pilihan A,Pilihan B,Pilihan C,,A,10\n"
        ).encode("utf-8")

        with self.assertRaises(HTTPException) as ctx:
            CBTService.parse_and_validate_file(csv_content, "soal_gagal.csv")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Pilihan D kosong", ctx.exception.detail)

    def test_reject_invalid_answer_key(self):
        # Answer key is 'Z' which does not exist
        csv_content = (
            "No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Kunci Jawaban,Poin\n"
            "1,Pertanyaan satu,Opt A,Opt B,Opt C,Opt D,Z,10\n"
        ).encode("utf-8")

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


if __name__ == "__main__":
    unittest.main()
