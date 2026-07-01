package com.flatwise.app.parser

enum class Merchant(
    val displayName: String,
    val aliases: List<String>,
) {
    Blinkit(
        displayName = "Blinkit",
        aliases = listOf("blinkit", "blnkit", "grofers"),
    ),
    Instamart(
        displayName = "Instamart",
        aliases = listOf("instamart", "swiggy inst", "swiggyinst", "swiggy instamart"),
    ),
    Swiggy(
        displayName = "Swiggy",
        aliases = listOf("swiggy food", "swiggy", "bundl"),
    ),
    Zomato(
        displayName = "Zomato",
        aliases = listOf("zomato", "eternal"),
    ),
    Zepto(
        displayName = "Zepto",
        aliases = listOf("zepto"),
    );

    companion object {
        fun fromText(text: String): Merchant? {
            val normalized = text.lowercase()
            val candidates = entries
                .flatMap { merchant -> merchant.aliases.map { alias -> merchant to alias } }
                .sortedByDescending { (_, alias) -> alias.length }
            return candidates.firstOrNull { (_, alias) -> normalized.contains(alias) }?.first
        }
    }
}
