package com.flatwise.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Radar
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.flatwise.app.data.AppContainer
import com.flatwise.app.data.CandidateStatus
import com.flatwise.app.data.TransactionCandidate
import com.flatwise.app.notifications.NotificationAccess
import com.flatwise.app.parser.TransactionAlertParser
import com.flatwise.app.splitwise.SplitwiseConnectionState
import com.flatwise.app.ui.FlatwiseTheme
import com.flatwise.app.ui.ManualAlertTester
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

private val Ink = Color(0xFF241A20)
private val Night = Color(0xFFF5DFC5)
private val Moss = Color(0xFF42695A)
private val Acid = Color(0xFFE95F4F)
private val Mint = Color(0xFF8FB99F)
private val Paper = Color(0xFFFFF3DE)
private val PaperSoft = Color(0xFFEBCBA8)
private val Muted = Color(0xFF7D6D63)
private val Ember = Color(0xFFF1B85B)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 42)
        }
        AppContainer.splitwiseAuthRepository.handleRedirect(intent?.data)
        AppContainer.splitwiseAuthRepository.refreshFromStoredToken()
        setContent {
            FlatwiseTheme {
                FlatwiseScreen(
                    onOpenNotificationSettings = {
                        startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                    },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        AppContainer.splitwiseAuthRepository.handleRedirect(intent.data)
    }
}

@Composable
private fun FlatwiseScreen(
    onOpenNotificationSettings: () -> Unit,
) {
    val repository = AppContainer.repository
    val authRepository = AppContainer.splitwiseAuthRepository
    val candidates by repository.candidates.collectAsState()
    val splitwiseState by authRepository.state.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var notificationsEnabled by remember { mutableStateOf(NotificationAccess.isEnabled(context)) }
    var postMessage by remember { mutableStateOf<String?>(null) }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                notificationsEnabled = NotificationAccess.isEnabled(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val pending = candidates.filter { it.status == CandidateStatus.Pending }
    val history = candidates.filter { it.status != CandidateStatus.Pending }

    Surface(modifier = Modifier.fillMaxSize(), color = Night) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFFF6D8BA), Color(0xFFFFF3DE), Color(0xFFF0CFA8))))
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            item {
                Spacer(modifier = Modifier.height(18.dp))
                HeroHeader(
                    pendingCount = pending.size,
                    notificationsEnabled = notificationsEnabled,
                    splitwiseState = splitwiseState,
                    onRefresh = { notificationsEnabled = NotificationAccess.isEnabled(context) },
                )
            }

            item {
                SystemStatusStrip(
                    notificationsEnabled = notificationsEnabled,
                    splitwiseState = splitwiseState,
                )
            }

            if (splitwiseState !is SplitwiseConnectionState.Connected) {
                item {
                    SplitwiseOnboardingCard(
                        splitwiseState = splitwiseState,
                        onConnectSplitwise = { authRepository.buildAuthIntent()?.let(context::startActivity) },
                    )
                }
            } else {
                val connected = splitwiseState as SplitwiseConnectionState.Connected
                if (connected.groups.isNotEmpty()) {
                    item {
                        FlatGroupSetupCard(
                            splitwiseState = connected,
                            onSelectGroup = authRepository::selectGroup,
                        )
                    }
                }
            }

            item {
                SectionTitle(
                    eyebrow = "INBOX",
                    title = "Receipt stack",
                    subtitle = if (pending.isEmpty()) "No open drafts yet. New supported payment alerts will appear here for review." else "${pending.size} alert${if (pending.size == 1) "" else "s"} ready for your tap.",
                    tint = Acid,
                )
            }

            if (pending.isEmpty()) {
                item { EmptyState() }
            } else {
                items(pending, key = { it.id }) { candidate ->
                    CandidateCard(
                        candidate = candidate,
                        postMessage = postMessage,
                        onPost = {
                            val connected = splitwiseState as? SplitwiseConnectionState.Connected
                            if (connected?.selectedGroupId != null) {
                                scope.launch {
                                    postMessage = "Posting to Splitwise..."
                                    runCatching { authRepository.createExpense(candidate) }
                                        .onSuccess {
                                            repository.markPosted(candidate.id)
                                            postMessage = "Posted to Splitwise."
                                        }
                                        .onFailure { error ->
                                            postMessage = error.message ?: "Could not post to Splitwise."
                                        }
                                }
                            } else {
                                repository.markPosted(candidate.id)
                                postMessage = "Marked locally. Connect Splitwise and choose a group for real posting."
                            }
                        },
                        onIgnore = { repository.ignore(candidate.id) },
                    )
                }
            }

            item {
                ManualAlertTester(
                    onParsed = { raw ->
                        TransactionAlertParser.parse(raw, "Manual test")?.let(repository::add)
                    },
                )
            }

            item {
                ControlPanel(
                    notificationsEnabled = notificationsEnabled,
                    splitwiseState = splitwiseState,
                    onDisconnectSplitwise = authRepository::disconnect,
                    onEnableNotifications = onOpenNotificationSettings,
                    onClearData = repository::clearAll,
                )
            }

            if (history.isNotEmpty()) {
                item {
                    SectionTitle(
                        eyebrow = "TRAIL",
                        title = "Closed crumbs",
                        subtitle = "What this build already posted or dismissed.",
                        tint = Mint,
                    )
                }
                items(history, key = { it.id }) { candidate ->
                    HistoryRow(candidate)
                }
            }

            item { Spacer(modifier = Modifier.height(26.dp)) }
        }
    }
}

@Composable
private fun HeroHeader(
    pendingCount: Int,
    notificationsEnabled: Boolean,
    splitwiseState: SplitwiseConnectionState,
    onRefresh: () -> Unit,
) {
    var loaded by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (loaded) 1f else 0.97f, label = "hero-scale")
    LaunchedEffect(Unit) { loaded = true }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandMark()
            StatusPill(
                text = if (notificationsEnabled) "LISTENING" else "SETUP",
                active = notificationsEnabled,
                onClick = onRefresh,
            )
        }
        Spacer(modifier = Modifier.height(22.dp))
        Text(
            text = "Now printing",
            color = Acid,
            fontSize = 13.sp,
            fontWeight = FontWeight.Black,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = if (pendingCount == 0) "No receipts in the tray" else "$pendingCount receipt${if (pendingCount == 1) "" else "s"} waiting for the flat",
            color = Ink,
            fontSize = 34.sp,
            lineHeight = 36.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 0.sp,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = splitwiseState.heroLine(),
            color = Muted,
            fontSize = 15.sp,
            lineHeight = 20.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun BrandMark() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .shadow(18.dp, RoundedCornerShape(18.dp), spotColor = Ink.copy(alpha = 0.12f))
                .background(Ink, RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text("C", color = Paper, fontSize = 24.sp, fontWeight = FontWeight.Black)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text("CRUMB", fontSize = 23.sp, fontWeight = FontWeight.Black, color = Ink)
            Text("receipt relay", fontSize = 12.sp, color = Muted, fontWeight = FontWeight.Black)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StatusPill(text: String, active: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(22.dp),
        color = if (active) Mint.copy(alpha = 0.92f) else Ember.copy(alpha = 0.92f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.42f)),
        shadowElevation = 10.dp,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 13.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(Ink, CircleShape),
            )
            Spacer(modifier = Modifier.width(7.dp))
            Text(text, fontSize = 11.sp, fontWeight = FontWeight.Black, color = Ink)
        }
    }
}

@Composable
private fun SplitwiseOnboardingCard(
    splitwiseState: SplitwiseConnectionState,
    onConnectSplitwise: () -> Unit,
) {
    val canConnect = splitwiseState is SplitwiseConnectionState.Disconnected || splitwiseState is SplitwiseConnectionState.Error
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(26.dp, RoundedCornerShape(34.dp), spotColor = Ink.copy(alpha = 0.18f))
            .border(BorderStroke(2.dp, Ink.copy(alpha = 0.82f)), RoundedCornerShape(34.dp)),
        shape = RoundedCornerShape(34.dp),
        color = Color(0xFFFFEAD0),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .background(Ink, RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.AccountBalanceWallet, contentDescription = null, tint = Ember, modifier = Modifier.size(25.dp))
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("SPLITWISE FIRST", color = Acid, fontSize = 12.sp, fontWeight = FontWeight.Black)
                    Text(splitwiseState.setupTitle(), color = Ink, fontSize = 24.sp, lineHeight = 27.sp, fontWeight = FontWeight.Black)
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                splitwiseState.setupCopy(),
                color = Muted,
                fontSize = 15.sp,
                lineHeight = 21.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(18.dp))
            Button(
                modifier = Modifier.fillMaxWidth(),
                enabled = canConnect,
                onClick = onConnectSplitwise,
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Ink,
                    contentColor = Paper,
                    disabledContainerColor = PaperSoft,
                    disabledContentColor = Muted,
                ),
            ) {
                Text(splitwiseState.setupActionText(), fontWeight = FontWeight.Black)
                if (canConnect) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Rounded.ChevronRight, contentDescription = null, modifier = Modifier.size(19.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FlatGroupSetupCard(
    splitwiseState: SplitwiseConnectionState.Connected,
    onSelectGroup: (Long) -> Unit,
) {
    val selectedGroup = splitwiseState.selectedGroupId?.let { selected ->
        splitwiseState.groups.firstOrNull { it.id == selected }
    }
    var expanded by remember(splitwiseState.selectedGroupId) { mutableStateOf(selectedGroup == null) }
    val scrollState = rememberScrollState()

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(20.dp, RoundedCornerShape(30.dp), spotColor = Ink.copy(alpha = 0.13f))
            .border(BorderStroke(1.5.dp, Ink.copy(alpha = if (expanded) 0.72f else 0.24f)), RoundedCornerShape(30.dp)),
        onClick = { if (selectedGroup != null) expanded = !expanded },
        shape = RoundedCornerShape(30.dp),
        color = if (expanded) Color(0xFFFFF1D9) else Color(0xFFFFE8C7),
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(if (expanded) 52.dp else 44.dp)
                        .background(Mint, RoundedCornerShape(if (expanded) 20.dp else 17.dp))
                        .border(BorderStroke(1.3.dp, Ink.copy(alpha = 0.40f)), RoundedCornerShape(if (expanded) 20.dp else 17.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Group, contentDescription = null, tint = Ink, modifier = Modifier.size(23.dp))
                }
                Spacer(modifier = Modifier.width(13.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("FLAT GROUP", color = Acid, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    Text(
                        selectedGroup?.name ?: "Choose your home group",
                        color = Ink,
                        fontSize = if (expanded) 23.sp else 20.sp,
                        lineHeight = if (expanded) 27.sp else 23.sp,
                        fontWeight = FontWeight.Black,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Box(
                    modifier = Modifier
                        .background(if (expanded) Ink else Mint, RoundedCornerShape(18.dp))
                        .padding(horizontal = 12.dp, vertical = 9.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (expanded) "DONE" else "CHANGE",
                        color = if (expanded) Paper else Ink,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                    )
                }
            }

            if (!expanded && selectedGroup != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Confirmed receipts will be sent here after your tap.",
                    color = Muted,
                    fontSize = 13.sp,
                    lineHeight = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            AnimatedVisibility(visible = expanded) {
                Column {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Pick the Splitwise group where grocery receipts should land.",
                        color = Muted,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 300.dp)
                            .verticalScroll(scrollState),
                        verticalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        splitwiseState.groups.forEach { group ->
                            val selected = splitwiseState.selectedGroupId == group.id
                            Surface(
                                onClick = {
                                    onSelectGroup(group.id)
                                    expanded = false
                                },
                                shape = RoundedCornerShape(18.dp),
                                color = if (selected) Mint else Paper,
                                border = BorderStroke(2.dp, if (selected) Ink.copy(alpha = 0.62f) else Ink.copy(alpha = 0.16f)),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 13.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        group.name,
                                        color = Ink,
                                        fontWeight = FontWeight.Black,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f),
                                    )
                                    if (selected) {
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Icon(Icons.Rounded.Check, contentDescription = null, tint = Ink, modifier = Modifier.size(19.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
@Composable
private fun SystemStatusStrip(
    notificationsEnabled: Boolean,
    splitwiseState: SplitwiseConnectionState,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
        StatusChip(
            icon = Icons.Rounded.Notifications,
            label = "Listener",
            value = if (notificationsEnabled) "On" else "Off",
            tint = if (notificationsEnabled) Mint else Ember,
            modifier = Modifier.weight(1f),
        )
        StatusChip(
            icon = Icons.Rounded.Group,
            label = "Splitwise",
            value = splitwiseState.statusValue(),
            tint = if (splitwiseState is SplitwiseConnectionState.Connected) Mint else Ember,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun StatusChip(
    icon: ImageVector,
    label: String,
    value: String,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.shadow(12.dp, RoundedCornerShape(30.dp), spotColor = Ink.copy(alpha = 0.10f)),
        shape = RoundedCornerShape(30.dp),
        color = Color(0xFFFFEDD5),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.48f)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(tint.copy(alpha = 0.78f), RoundedCornerShape(17.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = Ink, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(label.uppercase(), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(modifier = Modifier.height(2.dp))
                Text(value, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun SectionTitle(eyebrow: String, title: String, subtitle: String, tint: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(eyebrow, color = tint, fontSize = 12.sp, fontWeight = FontWeight.Black, letterSpacing = 0.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text(title, fontSize = 28.sp, fontWeight = FontWeight.Black, color = Ink)
            Text(subtitle, fontSize = 14.sp, lineHeight = 18.sp, color = Muted, fontWeight = FontWeight.SemiBold)
        }
        Box(
            modifier = Modifier
                .size(42.dp)
                .shadow(14.dp, RoundedCornerShape(18.dp), spotColor = tint.copy(alpha = 0.24f))
                .background(tint.copy(alpha = 0.92f), RoundedCornerShape(18.dp))
                .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.32f)), RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.AutoMirrored.Rounded.ReceiptLong, contentDescription = null, tint = Ink, modifier = Modifier.size(22.dp))
        }
    }
}

@Composable
private fun CandidateCard(
    candidate: TransactionCandidate,
    postMessage: String?,
    onPost: () -> Unit,
    onIgnore: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(Color(0xFFFFF6E6), Color(0xFFFFE7C7))), RoundedCornerShape(30.dp))
            .border(BorderStroke(2.dp, Ink.copy(alpha = 0.86f)), RoundedCornerShape(24.dp)),
    ) {
        ReceiptTeeth()
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MerchantGlyph(candidate.merchant.displayName)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(candidate.merchant.displayName.uppercase(), fontSize = 18.sp, fontWeight = FontWeight.Black, color = Ink)
                        Text(candidate.sourceLabel, fontSize = 12.sp, color = Muted, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                ConfidenceBadge(candidate.confidence.name.uppercase())
            }
            Spacer(modifier = Modifier.height(18.dp))
            DottedRule()
            Spacer(modifier = Modifier.height(15.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text("Rs", color = Muted, fontSize = 20.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(bottom = 8.dp))
                Spacer(modifier = Modifier.width(7.dp))
                Text(
                    text = candidate.amount.stripTrailingZeros().toPlainString(),
                    fontSize = 68.sp,
                    lineHeight = 68.sp,
                    fontWeight = FontWeight.Black,
                    color = Ink,
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            ReceiptLine(
                left = candidate.occurredAt?.format(DateTimeFormatter.ofPattern("dd MMM, h:mm a")) ?: "Detected from alert",
                right = "EQUAL SPLIT",
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(
                    modifier = Modifier.weight(1f).height(58.dp),
                    onClick = onPost,
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Ink, contentColor = Paper),
                ) {
                    Text("SEND TO SPLITWISE", fontWeight = FontWeight.Black, fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(5.dp))
                    Icon(Icons.Rounded.ChevronRight, contentDescription = null, modifier = Modifier.size(18.dp))
                }
                Surface(
                    onClick = onIgnore,
                    shape = RoundedCornerShape(24.dp),
                    color = Ember.copy(alpha = 0.90f),
                    shadowElevation = 10.dp,
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
                ) {
                    Icon(Icons.Rounded.Close, contentDescription = "Ignore", tint = Ink, modifier = Modifier.padding(16.dp).size(20.dp))
                }
            }
            AnimatedVisibility(visible = postMessage != null) {
                Text(
                    text = postMessage.orEmpty(),
                    modifier = Modifier.padding(top = 12.dp),
                    color = Moss,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                )
            }
        }
        ReceiptTeeth()
    }
}

@Composable
private fun ReceiptTeeth() {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        repeat(18) {
            Box(
                modifier = Modifier
                    .size(width = 12.dp, height = 5.dp)
                    .background(Ink.copy(alpha = 0.12f), RoundedCornerShape(10.dp)),
            )
        }
    }
}

@Composable
private fun DottedRule() {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        repeat(26) {
            Box(modifier = Modifier.size(5.dp).background(Ink.copy(alpha = 0.22f), CircleShape))
        }
    }
}

@Composable
private fun MerchantGlyph(name: String) {
    Box(
        modifier = Modifier
            .size(54.dp)
            .background(Acid, RoundedCornerShape(20.dp))
            .border(BorderStroke(1.5.dp, Ink.copy(alpha = 0.72f)), RoundedCornerShape(20.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Text(name.take(1).uppercase(), color = Ink, fontSize = 25.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun ReceiptLine(left: String, right: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFFFE0B8).copy(alpha = 0.78f), RoundedCornerShape(20.dp))
            .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.38f)), RoundedCornerShape(20.dp))
            .padding(horizontal = 13.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(left, color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Black)
        Text(right, color = Ink, fontSize = 12.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun ConfidenceBadge(text: String) {
    Box(
        modifier = Modifier
            .background(Mint, RoundedCornerShape(16.dp))
            .border(BorderStroke(1.5.dp, Ink.copy(alpha = 0.55f)), RoundedCornerShape(16.dp))
            .padding(horizontal = 11.dp, vertical = 8.dp),
    ) {
        Text(text, fontSize = 10.sp, fontWeight = FontWeight.Black, color = Ink)
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(Color(0xFFFFF6E6), Color(0xFFFFE7C7))), RoundedCornerShape(30.dp))
            .border(BorderStroke(2.dp, Ink.copy(alpha = 0.86f)), RoundedCornerShape(24.dp))
            .padding(20.dp),
    ) {
        Text("NO OPEN DRAFTS", color = Acid, fontSize = 11.sp, fontWeight = FontWeight.Black)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Tray is quiet", color = Ink, fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.Black)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Supported payment alerts will land here, and Crumb will also ask from your notification shade.",
            color = Muted,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun ControlPanel(
    notificationsEnabled: Boolean,
    splitwiseState: SplitwiseConnectionState,
    onDisconnectSplitwise: () -> Unit,
    onEnableNotifications: () -> Unit,
    onClearData: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(24.dp, RoundedCornerShape(30.dp), spotColor = Ink.copy(alpha = 0.18f))
            .background(Ink, RoundedCornerShape(30.dp))
            .padding(20.dp),
    ) {
        Text("BACK COUNTER", color = Ember, fontSize = 12.sp, fontWeight = FontWeight.Black)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Connect the machinery", color = Paper, fontSize = 24.sp, fontWeight = FontWeight.Black)
        Spacer(modifier = Modifier.height(16.dp))
        SetupStep(
            icon = Icons.Rounded.AccountBalanceWallet,
            title = "Splitwise",
            detail = splitwiseState.detailText(),
            done = splitwiseState is SplitwiseConnectionState.Connected,
        )
        SetupStep(
            icon = Icons.Rounded.Notifications,
            title = "Notification access",
            detail = if (notificationsEnabled) "Android listener is allowed." else "Needed before real alerts can flow in.",
            done = notificationsEnabled,
        )
        SetupStep(
            icon = Icons.Rounded.CreditCard,
            title = "Draft safety",
            detail = "Nothing posts until you confirm the draft.",
            done = true,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = onEnableNotifications,
            colors = ButtonDefaults.buttonColors(containerColor = Ember, contentColor = Ink),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text(if (notificationsEnabled) "Listening" else "Enable notifications", fontWeight = FontWeight.Black)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onClearData) { Text("Reset", color = Paper.copy(alpha = 0.72f), fontWeight = FontWeight.Black) }
            if (splitwiseState is SplitwiseConnectionState.Connected) {
                TextButton(onClick = onDisconnectSplitwise) { Text("Disconnect", color = Paper.copy(alpha = 0.72f), fontWeight = FontWeight.Black) }
            }
        }
    }
}

@Composable
private fun SetupStep(icon: ImageVector, title: String, detail: String, done: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(if (done) Mint.copy(alpha = 0.92f) else Color(0xFF342A2F), RoundedCornerShape(16.dp))
                .border(BorderStroke(1.dp, Color.White.copy(alpha = if (done) 0.28f else 0.12f)), RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(if (done) Icons.Rounded.Check else icon, contentDescription = null, tint = if (done) Ink else Paper, modifier = Modifier.size(19.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = Paper, fontWeight = FontWeight.Black)
            Text(detail, color = Paper.copy(alpha = 0.62f), fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun HistoryRow(candidate: TransactionCandidate) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Paper, RoundedCornerShape(18.dp))
            .border(BorderStroke(1.5.dp, Ink.copy(alpha = 0.82f)), RoundedCornerShape(18.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MerchantGlyph(candidate.merchant.displayName)
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(candidate.merchant.displayName, fontWeight = FontWeight.Black, color = Ink)
                Text(candidate.status.name, fontSize = 13.sp, color = Muted, fontWeight = FontWeight.Bold)
            }
        }
        Text("Rs ${candidate.amount.stripTrailingZeros().toPlainString()}", fontWeight = FontWeight.Black, color = Acid)
    }
}

private fun SplitwiseConnectionState.heroLine(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "Add Splitwise credentials, then this machine can post real expenses."
        SplitwiseConnectionState.Disconnected -> "Connect Splitwise once; every detected bill becomes a soft little draft."
        SplitwiseConnectionState.Connecting -> "Splitwise is connecting in the browser flow."
        is SplitwiseConnectionState.Connected -> selectedGroupId?.let { "Group selected. Confirmed receipts can post for real." } ?: "Connected. Choose the flat group before posting."
        is SplitwiseConnectionState.Error -> "Splitwise needs a quick reconnect in the setup panel."
    }
}

private fun SplitwiseConnectionState.detailText(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "Waiting for developer credentials."
        SplitwiseConnectionState.Disconnected -> "Ready to connect your Splitwise account."
        SplitwiseConnectionState.Connecting -> "Connecting to Splitwise..."
        is SplitwiseConnectionState.Connected -> {
            val groupText = selectedGroupId?.let { selected -> groups.firstOrNull { it.id == selected }?.name }
            "Connected as ${user.displayName}; ${groupText ?: "choose a group"}."
        }
        is SplitwiseConnectionState.Error -> friendlyMessage()
    }
}

private fun SplitwiseConnectionState.primaryActionText(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "Connect"
        SplitwiseConnectionState.Disconnected -> "Connect"
        SplitwiseConnectionState.Connecting -> "Connecting"
        is SplitwiseConnectionState.Connected -> "Connected"
        is SplitwiseConnectionState.Error -> "Retry"
    }
}

private fun SplitwiseConnectionState.setupTitle(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "Add app keys"
        SplitwiseConnectionState.Disconnected -> "Connect Splitwise"
        SplitwiseConnectionState.Connecting -> "Opening Splitwise"
        is SplitwiseConnectionState.Connected -> "Splitwise connected"
        is SplitwiseConnectionState.Error -> "Reconnect Splitwise"
    }
}

private fun SplitwiseConnectionState.setupCopy(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "Developer credentials are missing on this build, so Crumb can only keep local drafts."
        SplitwiseConnectionState.Disconnected -> "Do this once. After that, every useful Blinkit, Instamart, Swiggy, Zepto, HDFC, ICICI, or Pluxee alert can become a reviewed Splitwise draft."
        SplitwiseConnectionState.Connecting -> "Finish the browser approval. Crumb will return here and load your groups automatically."
        is SplitwiseConnectionState.Connected -> "You are connected. Choose the flat group and Crumb can post confirmed receipts."
        is SplitwiseConnectionState.Error -> friendlyMessage()
    }
}

private fun SplitwiseConnectionState.setupActionText(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "Keys missing"
        SplitwiseConnectionState.Disconnected -> "Connect Splitwise"
        SplitwiseConnectionState.Connecting -> "Waiting for approval"
        is SplitwiseConnectionState.Connected -> "Connected"
        is SplitwiseConnectionState.Error -> "Retry connection"
    }
}

private fun SplitwiseConnectionState.statusValue(): String {
    return when (this) {
        SplitwiseConnectionState.NotConfigured -> "No keys"
        SplitwiseConnectionState.Disconnected -> "Off"
        SplitwiseConnectionState.Connecting -> "Linking"
        is SplitwiseConnectionState.Connected -> selectedGroupId?.let { "Ready" } ?: "Pick group"
        is SplitwiseConnectionState.Error -> "Reconnect"
    }
}

private fun SplitwiseConnectionState.Error.friendlyMessage(): String {
    return if (message.contains("Serializer", ignoreCase = true)) {
        "Auth parser needed an app update. Reconnect Splitwise once."
    } else {
        message
    }
}
