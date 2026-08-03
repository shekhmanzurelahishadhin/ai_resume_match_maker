<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;
use Smalot\PdfParser\Parser as PdfParserLib;

/**
 * PDF text extraction + experience-year heuristic.
 *
 * Uses smalot/pdfparser to extract text from text-based PDFs. Scanned image
 * PDFs (no text layer) are detected and surfaced as a parse error — OCR is
 * out of scope for v1 (per spec §14).
 */
class PdfParserService
{
    private PdfParserLib $parser;

    public function __construct(?PdfParserLib $parser = null)
    {
        $this->parser = $parser ?? new Parser();
    }

    /**
     * @param string|resource $pdfContent raw PDF bytes or a path
     */
    public function extractText(string $pdfContent): PdfTextResult
    {
        try {
            $pdf = $this->parser->parseContent($pdfContent);
            $text = $pdf->getText();
            $text = trim($text);
            if ($text === '') {
                return PdfTextResult::failed('No text layer found — the PDF may be a scanned image. OCR is not supported.');
            }
            return PdfTextResult::ok($text);
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'pdf_parse_failed',
                'error' => $e->getMessage(),
            ]));
            return PdfTextResult::failed('Failed to parse PDF: '.$e->getMessage());
        }
    }

    public function extractFromFile(string $path): PdfTextResult
    {
        if (! file_exists($path)) {
            return PdfTextResult::failed("File not found: {$path}");
        }
        try {
            $pdf = $this->parser->parseFile($path);
            $text = trim($pdf->getText());
            if ($text === '') {
                return PdfTextResult::failed('No text layer found — the PDF may be a scanned image.');
            }
            return PdfTextResult::ok($text);
        } catch (\Throwable $e) {
            return PdfTextResult::failed('Failed to parse PDF: '.$e->getMessage());
        }
    }
}
