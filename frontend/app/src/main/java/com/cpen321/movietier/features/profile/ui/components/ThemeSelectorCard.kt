package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.shared.components.ThemeMode
import com.cpen321.movietier.shared.components.ThemeViewModel

/**
 * Card displaying theme selection options (System, Light, Dark).
 */
@Composable
internal fun ThemeSelectorCard(themeMode: ThemeMode, themeViewModel: ThemeViewModel) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Theme",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = themeMode == ThemeMode.System,
                    onClick = { themeViewModel.setThemeMode(ThemeMode.System) },
                    label = { Text("System") },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("theme_system")
                )
                FilterChip(
                    selected = themeMode == ThemeMode.Light,
                    onClick = { themeViewModel.setThemeMode(ThemeMode.Light) },
                    label = { Text("Light") },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("theme_light")
                )
                FilterChip(
                    selected = themeMode == ThemeMode.Dark,
                    onClick = { themeViewModel.setThemeMode(ThemeMode.Dark) },
                    label = { Text("Dark") },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("theme_dark")
                )
            }
        }
    }
}
