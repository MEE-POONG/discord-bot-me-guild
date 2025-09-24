# Music Bot Feature

This module provides music bot functionality for the Discord bot, allowing users to play music from YouTube in voice channels.

## Features

- **Play Music**: Play songs from YouTube using `/play <query>`
- **Random Music**: Play random popular songs using `/random` or `/play` without query
- **Skip Songs**: Skip the current playing song using `/skip`
- **Pause/Resume**: Pause or resume playback using `/pause`
- **Stop**: Stop playback and leave voice channel using `/stop`
- **Queue Management**: View the current queue using `/queue`
- **Now Playing**: See what's currently playing using `/nowplaying`
- **Volume Control**: Adjust volume (0-100) using `/volume <level>`
- **Help Command**: Get help and see all available commands using `/help`

## 🎨 **Professional UI Features**

- **Beautiful Embeds**: Rich, colorful embeds with thumbnails and detailed information
- **Interactive Buttons**: Clickable buttons for music control (play, pause, skip, stop, queue)
- **Volume Controls**: Dedicated volume control buttons (mute, 50%, 100%, up/down)
- **Progress Bars**: Visual progress indicators for currently playing songs
- **Status Indicators**: Clear visual feedback for all actions
- **Professional Design**: Modern, clean interface with consistent branding

## Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/play` | Play a song from YouTube (or random if no query) | `/play query: <song name or URL>` (optional) |
| `/random` | Play a random popular song | `/random` |
| `/skip` | Skip the current song | `/skip` |
| `/pause` | Pause or resume playback | `/pause` |
| `/stop` | Stop playback and leave voice channel | `/stop` |
| `/queue` | Show the current queue | `/queue` |
| `/nowplaying` | Show currently playing song | `/nowplaying` |
| `/volume` | Set volume level (0-100) | `/volume level: <0-100>` (required) |
| `/help` | Show help and available commands | `/help` |

## Requirements

- Bot must have voice channel permissions
- Users must be in a voice channel to use music commands
- YouTube access for music streaming

## Dependencies

- `discord-player`: Main music player library
- `discord-player-youtubei`: Stable YouTube extractor (replaces unstable YoutubeExtractor)
- `@discord-player/extractor`: SoundCloud and other extractors
- `@discordjs/opus`: Opus audio codec for voice streaming
- `ffmpeg-static`: Static FFmpeg binary for audio processing
- `@ffmpeg-installer/ffmpeg`: FFmpeg installer for cross-platform compatibility
- `youtube-ext`: YouTube extractor (legacy, replaced by discord-player-youtubei)
- `ytdl-core`: YouTube downloader

## Project Structure

```
src/music/
├── dto/
│   ├── play.dto.ts          # Play command DTO with optional query parameter
│   ├── volume.dto.ts        # Volume command DTO with required level parameter
│   └── index.ts             # DTO exports
├── music.commands.ts        # Slash command handlers
├── music.service.ts         # Core music functionality
├── music.module.ts          # Module configuration
├── player.service.ts        # Discord Player initialization
├── ui.service.ts            # UI components and embeds
└── README.md               # Documentation
```

## DTOs (Data Transfer Objects)

The music module uses DTOs for type-safe parameter handling:

- **PlayDto**: Handles optional query parameter for song search
- **VolumeDto**: Handles required level parameter with validation (0-100)

## Usage

1. Join a voice channel
2. Use `/play` command with a song name or YouTube URL, or use `/play` without query to get a random song
3. Use `/random` command to specifically get a random popular song
4. Use other commands to control playback

## Random Music Feature

The bot now fetches random songs directly from YouTube! When you use `/play` without specifying a song or use `/random`, the bot will:

1. **Search YouTube** using popular music keywords (music 2024, trending music, viral songs, etc.)
2. **Randomly select** from the top 5 search results
3. **Play the chosen song** automatically

This ensures you always get fresh, trending content from YouTube's vast music library. The bot includes 50+ popular search queries covering various genres and moods:

- **Trending**: music 2024, popular songs 2024, viral songs
- **Genres**: pop music, rock music, hip hop music, electronic music, jazz music
- **Moods**: chill music, party music, workout music, study music, relaxing music
- **Special**: live music, acoustic music, music covers, music discovery

Perfect for discovering new music or when you can't decide what to listen to!

## Error Handling

The bot includes comprehensive error handling with fallback mechanisms:

### 🔄 **Fallback System**
- **Search Failures**: If a specific song search fails, the bot automatically tries to play a random song instead
- **Random Song Failures**: If random song search fails, it tries alternative search queries
- **Connection Issues**: Graceful handling of voice channel connection problems
- **Multiple Retry Attempts**: The bot tries different approaches before giving up

### 🛡️ **Error Scenarios Handled**
- **User not in voice channel**: Clear error message with instructions
- **No music playing**: Appropriate responses for each command
- **Invalid volume levels**: Validation with helpful error messages
- **YouTube search failures**: Automatic fallback to random songs
- **Voice connection issues**: Retry mechanisms and clear error reporting
- **Network problems**: Graceful degradation with fallback options
- **Opus module errors**: Proper audio codec handling
- **Invalid URL errors**: Query validation and sanitization
- **Extractor failures**: Multiple fallback strategies
- **Stream extraction errors**: Automatic retry with next available track
- **Encryption mode errors**: Proper Discord voice encryption handling
- **Player error events**: Comprehensive error event handling with specific error detection
- **Multiple extractor support**: YouTube + SoundCloud fallback for better reliability
- **Stable YouTube extractor**: Uses discord-player-youtubei instead of unstable YoutubeExtractor
- **Enhanced voice connection**: Improved voice channel connection settings
- **Node.js compatibility**: Fixed undici package compatibility with Node.js v18 using File API polyfill
- **FFmpeg integration**: Automatic FFmpeg detection and installation for audio processing
- **Legacy FFmpeg support**: Uses legacy FFmpeg mode for better compatibility with older encryption modes
- **YouTube.js warnings suppression**: Reduces console noise from YouTube parser warnings

### 📝 **User-Friendly Messages**
- **Search failures**: "❌ ไม่พบเพลง 'ชื่อเพลง' แต่สุ่มเพลง **เพลงใหม่** ให้แล้ว!"
- **Fallback success**: "🎲 สุ่มเพลง **ชื่อเพลง** ให้แล้ว! (ใช้ fallback)"
- **Complete failure**: "❌ ไม่สามารถสุ่มเพลงได้ในขณะนี้ กรุณาลองใหม่ภายหลัง"
