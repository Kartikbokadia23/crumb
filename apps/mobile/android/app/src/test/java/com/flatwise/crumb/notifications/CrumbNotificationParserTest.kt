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
}
