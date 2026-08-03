<?php

namespace App\Services;

class PdfTextResult
{
    private function __construct(
        public readonly bool $ok,
        public readonly ?string $text,
        public readonly ?string $error,
    ) {}

    public static function ok(string $text): self
    {
        return new self(true, $text, null);
    }

    public static function failed(string $error): self
    {
        return new self(false, null, $error);
    }
}
