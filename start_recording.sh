#!/bin/bash

croncmd="/home/pi/iptv_recorder/start_recording.sh"
cronenv="START_DATE=\"$START_DATE\" FINISH_DATE=\"$FINISH_DATE\" CHANNEL_NAME=\"$CHANNEL_NAME\" CHANNEL_URL=\"$CHANNEL_URL\""

( crontab -l | grep -v -F "$cronenv $croncmd" ) | crontab -

FILE_NAME="$(date +%Y-%m-%d-%H-%M-%S)-$CHANNEL_NAME"
FILE_PATH="/mnt/media/IPTV_Records"

ffmpeg -i "$CHANNEL_URL" -c copy "$FILE_PATH/$FILE_NAME.mp4" &

echo "$(date +%Y-%m-%d-%H-%M-%S) - Started for $CHANNEL_NAME" >> /home/pi/iptv_recorder/cron.log
