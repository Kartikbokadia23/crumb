package com.flatwise.crumb.notifications

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CrumbAndroidNotificationIngestionTest {
  private val swiggy = "Spent Rs.262 On HDFC Bank Card 8812 At PTM*SWIGGY IN. Ref 123456"
  private val twilioInstamart = "Sent from your Twilio trial account - Amt. debited Rs 2 to instamart"
  private val twilioInstamartOtp = "$twilioInstamart otp 696969"

  @Test
  fun sameValidNotificationDeliveredTwiceIsProcessedOnce() {
    val dedupe = CrumbNotificationEventDedupe()
    assertTrue(dedupe.shouldProcess("com.google.android.apps.messaging", swiggy))
    assertFalse(dedupe.shouldProcess("com.google.android.apps.messaging", swiggy))
  }

  @Test
  fun listenerReconnectUsesSameDedupeGate() {
    val dedupe = CrumbNotificationEventDedupe()
    assertTrue(dedupe.shouldProcess("com.google.android.apps.messaging", swiggy)) // onNotificationPosted
    assertFalse(dedupe.shouldProcess("com.google.android.apps.messaging", swiggy)) // onListenerConnected
  }

  @Test
  fun validMessagesAroundOtpRemainEligibleIndividually() {
    val dedupe = CrumbNotificationEventDedupe()
    assertTrue(CrumbAndroidNotificationIngestion.isEligibleReceiptText(swiggy))
    assertTrue(dedupe.shouldProcess("com.google.android.apps.messaging", swiggy))
    assertFalse(CrumbAndroidNotificationIngestion.isEligibleReceiptText("Swiggy OTP 123456 for Rs.262. Do not share."))
    val secondSwiggy = "Paid Rs.300 with HDFC Card at SWIGGY. Ref 654321"
    assertTrue(CrumbAndroidNotificationIngestion.isEligibleReceiptText(secondSwiggy))
    assertTrue(dedupe.shouldProcess("com.google.android.apps.messaging", secondSwiggy))
  }

  @Test
  fun rejectsAutoPaymentWithoutMerchantAndChatText() {
    assertTrue(CrumbAndroidNotificationIngestion.isEligibleReceiptText(swiggy))
    assertFalse(CrumbAndroidNotificationIngestion.isEligibleReceiptText("Auto payment of Rs.50 debited from your account"))
    assertFalse(CrumbAndroidNotificationIngestion.isEligibleReceiptText("20 rupees sent to Swiggy"))
  }

  @Test
  fun acceptsRealHdfcSwiggyTransaction() {
    assertTrue(CrumbAndroidNotificationIngestion.isEligibleReceiptText(swiggy))
    assertTrue(CrumbNotificationParser.parse(swiggy, "HDFC Bank") != null)
  }

  @Test
  fun acceptsTwilioInstamartCandidateAfterStrippingTransportPrefix() {
    val text = CrumbAndroidNotificationIngestion.stripTransportPrefix(twilioInstamart)
    assertTrue(CrumbAndroidNotificationIngestion.isEligibleReceiptText(text))
    val parsed = CrumbNotificationParser.parse(text, "Messages")
    assertTrue(parsed != null)
    assertTrue(parsed?.merchant == "Instamart")
    assertTrue(parsed?.amount == "2")
  }

  @Test
  fun rejectsTwilioOtpCandidate() {
    val text = CrumbAndroidNotificationIngestion.stripTransportPrefix(twilioInstamartOtp)
    assertFalse(CrumbAndroidNotificationIngestion.isEligibleReceiptText(text))
  }

  @Test
  fun conversationLinesRemainIndependentAndDeduplicateOnlyIdenticalCandidates() {
    val other = "Sent from your Twilio trial account - Paid Rs 3 to instamart"
    val candidates = CrumbAndroidNotificationIngestion.candidateTexts(
      textLines = listOf(twilioInstamart, twilioInstamartOtp, twilioInstamart, other),
      bigText = twilioInstamart,
      text = other
    )
    assertTrue(candidates == listOf(twilioInstamart, twilioInstamartOtp, other))

    val eligible = candidates
      .map(CrumbAndroidNotificationIngestion::stripTransportPrefix)
      .filter(CrumbAndroidNotificationIngestion::isEligibleReceiptText)
    assertTrue(eligible == listOf("Amt. debited Rs 2 to instamart", "Paid Rs 3 to instamart"))

    val dedupe = CrumbNotificationEventDedupe()
    assertTrue(dedupe.shouldProcess("com.google.android.apps.messaging", eligible[0]))
    assertTrue(dedupe.shouldProcess("com.google.android.apps.messaging", eligible[1]))
    assertFalse(dedupe.shouldProcess("com.google.android.apps.messaging", eligible[0]))
  }
}
