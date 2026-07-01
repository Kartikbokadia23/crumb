package com.flatwise.app.data

import com.flatwise.app.parser.Confidence
import com.flatwise.app.parser.Merchant
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

data class TransactionCandidate(
    val id: String = UUID.randomUUID().toString(),
    val merchant: Merchant,
    val amount: BigDecimal,
    val occurredAt: LocalDateTime?,
    val sourceLabel: String,
    val confidence: Confidence,
    val rawHash: String,
    val status: CandidateStatus = CandidateStatus.Pending,
)

enum class CandidateStatus {
    Pending,
    Posted,
    Ignored,
}
