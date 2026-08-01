package com.flatwise.crumb.notifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Test

class CrumbNotificationParserTest {
  @Test
  fun rejectsBankTransferEvenWhenMerchantTextLeaksIn() {
    val text = """
      Swiggy
      Sent Rs.50.00
      From HDFC Bank A/C *8899
      To Ram Balak
      On 13/07/26
      Ref 656019660532
      Not You?
      Call 18002586161/SMS BLOCK UPI to 7308080808
    """.trimIndent()

    assertNull(CrumbNotificationParser.parse(text, "bob World"))
  }

  @Test
  fun parsesKnownMerchantReceipt() {
    val parsed = CrumbNotificationParser.parse(
      "Swiggy order paid Rs.50.00 on 13/07/26",
      "Swiggy"
    )

    assertNotNull(parsed)
    assertEquals("Swiggy", parsed?.merchant)
    assertEquals("50", parsed?.amount)
  }

  @Test
  fun keepsDirectMerchantBankPaymentEligible() {
    val parsed = CrumbNotificationParser.parse(
      "Sent Rs.50.00 From HDFC Bank A/C *8899 To Swiggy On 13/07/26 Ref 656019660532",
      "HDFC Bank"
    )

    assertNotNull(parsed)
    assertEquals("Swiggy", parsed?.merchant)
    assertEquals("50", parsed?.amount)
  }

  @Test
  fun parsesHdfcCardReceiptWithBlockReissueFooter() {
    val parsed = CrumbNotificationParser.parse(
      "Spent Rs.412 On HDFC Bank Card 2333 At PYU*Instamart Grocery On 2026-08-01:11:22:47." +
        "Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 2333 to 7308080808",
      "HDFCBK"
    )

    assertNotNull(parsed)
    assertEquals("Instamart", parsed?.merchant)
    assertEquals("412", parsed?.amount)
    assertEquals("2026-08-01T11:22:47+05:30", parsed?.occurredAt)
  }

  @Test
  fun parsesRupeeSymbolAndBalanceIsNotTakenAsTheSpend() {
    val parsed = CrumbNotificationParser.parse(
      "ICICI Bank: Avl Bal Rs.5,000.00. ₹412.00 debited for purchase at ZEPTO on 10-Jan-24",
      "ICICI"
    )

    assertNotNull(parsed)
    assertEquals("Zepto", parsed?.merchant)
    assertEquals("412", parsed?.amount)
  }

  @Test
  fun rejectsRefundsCreditsAndDeclinedPayments() {
    assertNull(
      CrumbNotificationParser.parse(
        "Refund of Rs.412.00 for your Instamart order is credited to A/c X1234",
        "HDFC"
      )
    )
    assertNull(
      CrumbNotificationParser.parse("Rs.412.00 credited to your A/c X1234 from SWIGGY", "HDFC")
    )
    assertNull(
      CrumbNotificationParser.parse("Your payment of Rs.412.00 at ZEPTO was declined", "HDFC")
    )
  }

  @Test
  fun rejectsPromosAndOrderUpdates() {
    assertNull(CrumbNotificationParser.parse("Flat Rs.150 OFF on your next Zepto order!", "ZEPTO"))
    assertNull(
      CrumbNotificationParser.parse("Your Blinkit order of Rs.412 is out for delivery", "BLINKIT")
    )
  }

  @Test
  fun rejectsOtpEvenWhenMerchantAndAmountAppear() {
    val text = "Your Swiggy OTP is 123456 for transaction of Rs.50.00. Do not share it with anyone."

    assertNull(CrumbNotificationParser.parse(text, "Swiggy"))
  }

  @Test
  fun rejectsVerificationMessageEvenWithSupportedMerchantSource() {
    val text = "Use verification code 123456 to login. Never share this code. Amount Rs.50.00"

    assertNull(CrumbNotificationParser.parse(text, "Zomato"))
  }
}
