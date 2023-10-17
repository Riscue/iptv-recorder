#!/usr/bin/python3

import datetime
import os.path
import re
import subprocess
import urllib.request

iptv_link = "https://riscue.xyz/iptv.php"
iptv_file = "/tmp/tv_channels_sfo37aqtki_plus.m3u"

working_dir = "/home/pi/iptv_recorder"
start_croncmd = f"{working_dir}/start_recording.sh >> {working_dir}/record.log 2>&1"
end_croncmd = f"{working_dir}/finish_recording.sh >> {working_dir}/record.log 2>&1"

weekDays = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


def get_date(day_option):
    today = datetime.datetime.now().date()
    target_date = None

    if day_option == 'today':
        target_date = today
    elif day_option == 'tomorrow':
        target_date = today + datetime.timedelta(days=1)
    else:
        days_ahead = (weekDays.index(day_option) - today.weekday()) % 7
        target_date = today + datetime.timedelta(days=days_ahead)

    return target_date


def get_time(time_option):
    target_time = datetime.datetime.strptime(time_option, '%H:%M')
    return target_time


def datetime_to_cron(target_time, target_date):
    return f"{target_time.minute} {target_time.hour} {target_date.day} {target_date.month} *"


def main():
    start_time = input("Enter start time for recording (format: HH:MM): ")
    if not start_time:
        start_time = (datetime.datetime.now() + datetime.timedelta(hours=1)).strftime('%H:%M')
    start_time = get_time(start_time)

    start_day = input("Enter start day for recording (today, tomorrow, or a specific date or day of the week): ")
    if not start_day:
        start_day = 'today'
    start_date = get_date(start_day.lower())

    end_time = input("Enter end time for recording (format: HH:MM): ")
    if not end_time:
        end_time = (datetime.datetime.now() + datetime.timedelta(hours=2)).strftime('%H:%M')
    end_time = get_time(end_time)

    end_day = input("Enter end day for recording (today, tomorrow, or a specific date or day of the week): ")
    if not end_day:
        end_day = start_day
    end_date = get_date(end_day.lower())

    channel_name = input("Enter the channel name to be recorded (in the format 'BEIN SPORTS 1 HD+'): ")
    if not channel_name:
        channel_name = 'BEIN SPORTS 1 HD+'
    channel_name, channel_url = get_channel_info(channel_name.lower())

    add_cron(datetime_to_cron(start_time, start_date), datetime_to_cron(end_time, end_date), channel_name, channel_url)

    msg = f"Scheduled for '{channel_name}' between " \
          f"{start_date.strftime('%Y-%m-%d')} at {start_time.strftime('%H:%M')} and " \
          f"{end_date.strftime('%Y-%m-%d')} at {end_time.strftime('%H:%M')}."
    subprocess.run(f"echo $(date +%Y-%m-%d-%H-%M-%S)' - {msg}' >> {working_dir}/cron.log", shell=True)
    print(msg)


def find_line_above(channel_name, filename):
    with open(filename, 'r') as file:
        lines = file.readlines()

    for index, line in enumerate(lines):
        if channel_name in line.lower():
            return lines[index + 1].strip()
    return None


def find_name_iptv(channel_name, filename):
    with open(filename, 'r') as file:
        lines = file.readlines()

    for index, line in enumerate(lines):
        if channel_name.lower() in line.lower():
            result = re.search(r"tvg-name=\"([^\"]*)\"", line)
            return result.group(1).replace(":", "-").replace("(", "").replace(")", "").replace("TR-", "")


def get_channel_info(channel_name):
    if not os.path.isfile(iptv_file):
        print('Downloading iptv file')
        download(iptv_link, iptv_file)

    found_channel_name = find_name_iptv(channel_name, iptv_file)
    channel_url = find_line_above(channel_name, iptv_file)

    return found_channel_name, channel_url


def download(link, filename):
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-agent', 'Mozilla/5.0')]
    urllib.request.install_opener(opener)
    urllib.request.urlretrieve(link, filename)


def add_cron(start_cron_expression, end_cron_expression, channel_name, channel_url):
    start_cronjob = f"{start_cron_expression} " \
                    f"START_DATE=\"{start_cron_expression}\" " \
                    f"FINISH_DATE=\"{end_cron_expression}\" " \
                    f"CHANNEL_NAME=\"{channel_name}\" " \
                    f"CHANNEL_URL=\"{channel_url}\" " \
                    f"{start_croncmd}"
    end_cronjob = f"{end_cron_expression} " \
                  f"START_DATE=\"{start_cron_expression}\" " \
                  f"FINISH_DATE=\"{end_cron_expression}\" " \
                  f"CHANNEL_NAME=\"{channel_name}\" " \
                  f"CHANNEL_URL=\"{channel_url}\" " \
                  f"{end_croncmd}"

    subprocess.run(f"(crontab -l; echo '{start_cronjob}') | crontab -", shell=True)
    subprocess.run(f"(crontab -l; echo '{end_cronjob}') | crontab -", shell=True)


if __name__ == '__main__':
    main()
