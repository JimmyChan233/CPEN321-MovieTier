package com.cpen321.movietier.ui.friends.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsTopBar() {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(id = R.drawable.in_app_icon), "MovieTier", Modifier.size(32.dp))
                Spacer(Modifier.width(8.dp))
                Text("MovieTier", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        },
        windowInsets = WindowInsets(0, 0, 0, 0)
    )
}
