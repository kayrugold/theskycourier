Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $speaker.GetInstalledVoices()
$voice = $voices | Where-Object { $_.VoiceInfo.Name -like '*David*' } | Select-Object -First 1
if ($voice) { $speaker.SelectVoice($voice.VoiceInfo.Name) }
$speaker.Rate = 2
$speaker.Volume = 100
$folder = Join-Path (Get-Location) 'assets/audio'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$speaker.SetOutputToWaveFile((Join-Path $folder 'thief-warning.wav'))
$speaker.Speak('Hey! Get back here!')
$speaker.SetOutputToNull()
$speaker.Dispose()
Get-Item (Join-Path $folder 'thief-warning.wav') | Select-Object Name,Length
