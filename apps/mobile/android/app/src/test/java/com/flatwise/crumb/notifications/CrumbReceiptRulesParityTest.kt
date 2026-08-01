package com.flatwise.crumb.notifications

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

/**
 * shared/parser-rules.json is the canonical vocabulary; packages/core has the mirror of
 * this test. Android holds its own copy because the notification listener runs without a
 * JS runtime — this test is what keeps the two copies honest.
 */
class CrumbReceiptRulesParityTest {
  private val rulesJson: String by lazy {
    var dir: File? = File("").absoluteFile
    while (dir != null && !File(dir, "shared/parser-rules.json").exists()) dir = dir.parentFile
    assertNotNull("shared/parser-rules.json not found above ${File("").absolutePath}", dir)
    File(dir, "shared/parser-rules.json").readText()
  }

  @Test
  fun merchantAliasesMatchSharedRules() {
    val merchants = objectBody("merchants")
    val expected = Regex(""""([A-Za-z]+)"\s*:\s*\[([^]]*)]""")
      .findAll(merchants)
      .map { it.groupValues[1] to strings(it.groupValues[2]) }
      .toList()

    assertEquals(expected, CrumbReceiptRules.merchantAliases)
  }

  @Test
  fun termListsMatchSharedRules() {
    assertEquals(array("debitTerms"), CrumbReceiptRules.debitTerms)
    assertEquals(array("strongDebitTerms"), CrumbReceiptRules.strongDebitTerms)
    assertEquals(array("creditTerms"), CrumbReceiptRules.creditTerms)
    assertEquals(array("nonExpenseTerms"), CrumbReceiptRules.nonExpenseTerms)
    assertEquals(array("otpTerms"), CrumbReceiptRules.otpTerms)
    assertEquals(array("footerTerms"), CrumbReceiptRules.footerTerms)
    assertEquals(array("balanceTerms"), CrumbReceiptRules.balanceTerms)
  }

  @Test
  fun everyStrongDebitTermIsAlsoADebitTerm() {
    assertEquals(emptyList<String>(), CrumbReceiptRules.strongDebitTerms - CrumbReceiptRules.debitTerms.toSet())
  }

  // Minimal readers: the file is ours and flat, and unit tests have no JSON library.
  private fun array(key: String): List<String> {
    val body = Regex(""""$key"\s*:\s*\[([^]]*)]""").find(rulesJson)?.groupValues?.get(1)
    assertNotNull("missing array $key", body)
    return strings(body!!)
  }

  private fun objectBody(key: String): String {
    val start = rulesJson.indexOf("\"$key\"").let { rulesJson.indexOf('{', it) }
    var depth = 0
    for (i in start until rulesJson.length) {
      if (rulesJson[i] == '{') depth++
      if (rulesJson[i] == '}' && --depth == 0) return rulesJson.substring(start + 1, i)
    }
    throw AssertionError("unterminated object $key")
  }

  private fun strings(body: String): List<String> =
    Regex(""""([^"]*)"""").findAll(body).map { it.groupValues[1] }.toList()
}
