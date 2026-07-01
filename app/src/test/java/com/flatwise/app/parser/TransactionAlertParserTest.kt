package com.flatwise.app.parser

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import java.math.BigDecimal
import java.time.LocalDateTime

class TransactionAlertParserTest {
    @Test
    fun parsesHdfcInstamartCardAlert() {
        val parsed = TransactionAlertParser.parse(
            "Spent Rs.203 On HDFC Bank Card 1116 At PYU*Instamart Grocery On 2026-03-19:16:10:45.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 1116 to 7308080808",
            "Messages",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Instamart)
        assertThat(parsed.amount.compareTo(BigDecimal("203"))).isEqualTo(0)
        assertThat(parsed.occurredAt).isEqualTo(LocalDateTime.of(2026, 3, 19, 16, 10, 45))
        assertThat(parsed.confidence).isEqualTo(Confidence.High)
    }

    @Test
    fun parsesHdfcSwiggyCardAlert() {
        val parsed = TransactionAlertParser.parse(
            "Spent Rs.476 On HDFC Bank Card 1116 At PYU*Swiggy Food On 2026-03-19:16:08:31.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 1116 to 7308080808",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Swiggy)
        assertThat(parsed.amount.compareTo(BigDecimal("476"))).isEqualTo(0)
    }

    @Test
    fun parsesPluxeeBlinkitAlert() {
        val parsed = TransactionAlertParser.parse(
            "Rs. 801.00 spent from Pluxee  Meal wallet, card no.xx8691 on 25-03-2026 22:44:50 at BLINKIT . Avl bal Rs.1574.24. Not you call 18002106919",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Blinkit)
        assertThat(parsed.amount.compareTo(BigDecimal("801.00"))).isEqualTo(0)
        assertThat(parsed.occurredAt).isEqualTo(LocalDateTime.of(2026, 3, 25, 22, 44, 50))
    }

    @Test
    fun parsesPluxeeSwiggyInstAsInstamart() {
        val parsed = TransactionAlertParser.parse(
            "Rs. 352.00 spent from Pluxee  Meal wallet, card no.xx8691 on 22-03-2026 14:42:11 at SWIGGY INST . Avl bal Rs.2646.24. Not you call 18002106919",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Instamart)
        assertThat(parsed.amount.compareTo(BigDecimal("352.00"))).isEqualTo(0)
    }

    @Test
    fun parsesHdfcUpiBlinkitAlert() {
        val parsed = TransactionAlertParser.parse(
            "Sent Rs.270.00 From HDFC Bank A/C *8899 To Blinkit On 31/05/26 Ref 651715008613 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Blinkit)
        assertThat(parsed.amount.compareTo(BigDecimal("270.00"))).isEqualTo(0)
        assertThat(parsed.occurredAt).isEqualTo(LocalDateTime.of(2026, 5, 31, 0, 0))
    }

    @Test
    fun parsesIciciBlinkitAlert() {
        val parsed = TransactionAlertParser.parse(
            "ICICI Bank Credit Card XX8006 debited for INR 598.00 on 12-Jun-26 for UPI-652977384174-Blinkit. To dispute call 18001080/SMS BLOCK 8006 to 9215676766",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Blinkit)
        assertThat(parsed.amount.compareTo(BigDecimal("598.00"))).isEqualTo(0)
        assertThat(parsed.occurredAt).isEqualTo(LocalDateTime.of(2026, 6, 12, 0, 0))
    }

    @Test
    fun parsesPluxeeZeptoAlert() {
        val parsed = TransactionAlertParser.parse(
            "Rs. 1100.00 spent from Pluxee  Meal wallet, card no.xx8691 on 15-01-2026 19:16:10 at ZEPTO . Avl bal Rs.1246.34. Not you call 18002106919",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Zepto)
        assertThat(parsed.amount.compareTo(BigDecimal("1100.00"))).isEqualTo(0)
        assertThat(parsed.occurredAt).isEqualTo(LocalDateTime.of(2026, 1, 15, 19, 16, 10))
    }

    @Test
    fun usesFirstAmountAndIgnoresAvailableBalance() {
        val parsed = TransactionAlertParser.parse(
            "Rs. 690.00 spent from Pluxee Meal wallet, card no.xx8691 on 10-01-2026 15:02:03 at SWIGGY . Avl bal Rs.3449.34. Not you call 18002106919",
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed!!.merchant).isEqualTo(Merchant.Swiggy)
        assertThat(parsed.amount.compareTo(BigDecimal("690.00"))).isEqualTo(0)
    }

    @Test
    fun ignoresUnknownMerchants() {
        val parsed = TransactionAlertParser.parse("Spent Rs.200 at Local Cafe")

        assertThat(parsed).isNull()
    }
}
