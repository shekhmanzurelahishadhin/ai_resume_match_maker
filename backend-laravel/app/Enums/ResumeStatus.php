<?php

namespace App\Enums;

enum ResumeStatus: string
{
    case Pending = 'pending';
    case Parsing = 'parsing';
    case Ready = 'ready';
    case Failed = 'failed';
}
