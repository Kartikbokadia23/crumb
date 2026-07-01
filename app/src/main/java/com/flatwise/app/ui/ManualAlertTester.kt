package com.flatwise.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flatwise.app.parser.TransactionAlertParser

private val Ink = Color(0xFF241A20)
private val Paper = Color(0xFFFFF3DE)
private val Acid = Color(0xFFE95F4F)
private val Mint = Color(0xFF8FB99F)
private val Muted = Color(0xFF7D6D63)
private val Ember = Color(0xFFF1B85B)

@Composable
fun ManualAlertTester(
    onParsed: (raw: String) -> Unit,
) {
    var raw by remember { mutableStateOf("") }
    val preview = remember(raw) {
        if (raw.isBlank()) null else TransactionAlertParser.parse(raw, "Manual test")
    }

    Card(
        shape = RoundedCornerShape(30.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier
                .shadow(22.dp, RoundedCornerShape(34.dp), spotColor = Ink.copy(alpha = 0.14f))
                .background(Brush.linearGradient(listOf(Color(0xFFFFF8EA), Color(0xFFFFE2C3))), RoundedCornerShape(34.dp))
                .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.42f)), RoundedCornerShape(34.dp))
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier
                        .size(42.dp)
                        .shadow(10.dp, RoundedCornerShape(18.dp), spotColor = Acid.copy(alpha = 0.20f))
                        .background(Acid.copy(alpha = 0.92f), RoundedCornerShape(18.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Science, contentDescription = null, tint = Ink)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Receipt lab", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Ink)
                    Text("Paste an alert. Crumb tries to print a clean draft.", color = Muted, fontSize = 13.sp)
                }
            }
            Spacer(modifier = Modifier.height(15.dp))
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = raw,
                onValueChange = { raw = it },
                minLines = 3,
                maxLines = 5,
                shape = RoundedCornerShape(24.dp),
                label = { Text("Payment alert text") },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Ink,
                    unfocusedTextColor = Ink,
                    focusedLabelColor = Mint,
                    unfocusedLabelColor = Muted,
                    focusedBorderColor = Mint,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.16f),
                    cursorColor = Mint,
                    focusedContainerColor = Color(0xFFFFF3DE),
                    unfocusedContainerColor = Color(0xFFFFF3DE),
                ),
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (preview == null) Color(0xFFF8D9B3) else Color(0xFFE8F0DE), RoundedCornerShape(20.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = if (preview == null) Ember else Mint, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(9.dp))
                Text(
                    text = preview?.let {
                        "Matched ${it.merchant.displayName} Rs.${it.amount.stripTrailingZeros().toPlainString()} (${it.confidence.name})"
                    } ?: "No print yet. Waiting for a supported merchant pattern.",
                    color = if (preview == null) Color(0xFF9A3A19) else Mint,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(modifier = Modifier.height(13.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Button(
                    enabled = preview != null,
                    onClick = {
                        onParsed(raw)
                        raw = ""
                    },
                    shape = RoundedCornerShape(22.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Mint,
                        contentColor = Ink,
                        disabledContainerColor = Color(0xFFD8C2A0),
                        disabledContentColor = Muted,
                    ),
                ) {
                    Text("Print draft", fontWeight = FontWeight.Black)
                }
                TextButton(onClick = { raw = "" }) {
                    Text("Clear", color = Muted, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
