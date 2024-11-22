import requests
import time
import threading
import telebot
from background import keep_alive

bot_token = '6805670669:AAF4m-cLC978kYbAvatjMcbkytp31bq-D24'
chat_id = 5016901672  # Replace with your actual chat ID

bot = telebot.TeleBot(bot_token)

names = ['kata', 'dope', 'dray', 'cash', 'dewy', 'drop', 'drug', 'days', 'echo',
  'sept', 'easy', 'paid', 'swag', 'sett', 'date', 'cuff', 'rage', 'rock',
  'babe', 'dare', 'rich', 'duff', 'dunk', 'food', 'husk', 'live', 'till',
  'mood', 'kill', 'lime', 'leaf', 'team', 'jobs', 'prez', 'test', 'poor',
  'help', 'magi', 'heal', 'here', 'hack', 'year', 'kiss', 'loto',
  'dork', 'jean', 'howl', 'oink', 'papa', 'exec', 'anil',
  'dorb', 'mads', 'marc','ponk','rudy','skee','smit','taki','woes', 'ziff', 'sjoe', 'dopy', 'euks', 'cord', 'slut', 'feed', 'agog', 'guns', 'clit', 'nide', 'rahs']
available = []
lock = threading.Lock()
event = threading.Event()


# sends each double-check individually to avoid errors with the order of the operation responses
def doubleCheck(name: str):
  while True:
    try:
      body = requests.post(
        'https://gql.twitch.tv/gql',
        json=[{
          'operationName': 'UsernameValidator_User',
          'variables': {
            'username': name
          },
          'extensions': {
            'persistedQuery': {
              'version':
              1,
              'sha256Hash':
              'fd1085cf8350e309b725cf8ca91cd90cac03909a3edeeedbd0872ac912f3d660'
            }
          }
        }],
        headers={
          'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
        }).json()
      if not body[0]['data']['isUsernameAvailable']:
        print(f'{name} not available, retrying...')
        time.sleep(120)  # wait for 120 second before retrying
        continue

      with lock:
        available.append(name)
        bot.send_message(chat_id, f'[{name}] AVAILABLE')
      break  # Break out of the loop if the nickname is available
    except Exception as e:
      print(e)


def check(chat_id):
  operations = []
  checkingNames = []
  while len(operations) < 35 and len(names) > 0:
    name = names.pop()
    if not name:
      break

    checkingNames.append(name)
    operations.append({
      'operationName': 'ChannelShell',
      'variables': {
        'login': name
      },
      'extensions': {
        'persistedQuery': {
          'version':
          1,
          'sha256Hash':
          '580ab410bcd0c1ad194224957ae2241e5d252b2c5173d8e0cce9d32d5bb14efe'
        }
      }
    })

  if len(operations) == 0:
    return

  try:
    body = requests.post('https://gql.twitch.tv/gql',
                         json=operations,
                         headers={
                           'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
                         }).json()

    if not body or len(body) == 0:
      raise Exception('No body')

    for d in body:
      user = d['data']['userOrError']

      if not 'reason' in user:
        continue

      reason = user['reason']
      username = user['userDoesNotExist']

      if reason != 'UNKNOWN':
        continue

      threading.Thread(target=doubleCheck, args=(username, )).start()
  except Exception as e:
    print('ERROR:' + str(e))
    for name in checkingNames:
      names.append(name)


def main(chat_id):
  print(f'Loaded {len(names)} names, starting now...')

  while len(names) > 0:
    threading.Thread(target=check, args=(chat_id, )).start()
    time.sleep(0.1)

  event.wait()
  bot.send_message(chat_id, f'Found {len(available)} available names')
  bot.send_message(chat_id, 'Finished checking all names')

keep_alive()
if __name__ == '__main__':
  main(chat_id)
  bot.polling(none_stop=True)
