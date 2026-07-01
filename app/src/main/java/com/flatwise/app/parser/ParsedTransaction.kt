package com.flatwise.app.parser

import java.math.BigDecimal
import java.time.LocalDateTime

data class ParsedTransaction(
    val amount: BigDecimal,
    val merchant: Merchant,
    val occurredAt: LocalDateTime?,
    val sourceLabel: String,
    val confidence: Confidence,
    val rawHash: String,
)

enum class Confidence {
    High,
    Medium,
    Low,
}
