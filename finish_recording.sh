#!/bin/bash

croncmd="/home/pi/iptv_recorder/finish_recording.sh"
cronenv="START_DATE=\"$START_DATE\" FINISH_DATE=\"$FINISH_DATE\" CHANNEL_NAME=\"$CHANNEL_NAME\" CHANNEL_URL=\"$CHANNEL_URL\""

( crontab -l | grep -v -F "$cronenv $croncmd" ) | crontab -

ps aux | grep ffmpeg | grep iptv | grep -v grep | grep -v EmbyServer | awk '{print $2}' | xargs kill -15

echo "$(date +%Y-%m-%d-%H-%M-%S) - Finished for $CHANNEL_NAME" >> /home/pi/iptv_recorder/cron.log
