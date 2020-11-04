import collections
import json
import pprint
import subprocess

FIRST_COMMIT_SHORT_SHA = '6ab578d'

MI_INDEX = 22
PA_INDEX = 38

STATE_INDEXES = [MI_INDEX, PA_INDEX]

def git_checkout(ref):
    subprocess.check_output(['git', 'checkout', '--quiet', ref])

def current_commit_short_sha():
    return subprocess.check_output(["git", "describe", "--always"]).strip().decode()

def fetch_all_results_jsons():
    jsons = []
    git_checkout('master')
    while current_commit_short_sha() != FIRST_COMMIT_SHORT_SHA:
        with open('results.json') as f:
            jsons.insert(0, json.load(f))
        git_checkout('HEAD^')
    return jsons

summarized = {}
jsons = fetch_all_results_jsons()

for state_index in STATE_INDEXES:
    state_name = jsons[0]['data']['races'][state_index]['state_id']
    summarized[state_name] = collections.OrderedDict()
    for json in jsons:
        timestamp = json['meta']['timestamp']
        candidate1 = json['data']['races'][state_index]['candidates'][0]
        candidate2 = json['data']['races'][state_index]['candidates'][1]
        candidate_votes = {
            candidate1['candidate_key']: candidate1['votes'],
            candidate2['candidate_key']: candidate2['votes'],
        }
        if len(summarized[state_name]) == 0 or candidate_votes != next(reversed(summarized[state_name].values())):
            summarized[state_name][timestamp] = candidate_votes


for (state, timestamped_results) in summarized.items():
    print(state)
    for (timestamp, candidate_votes) in timestamped_results.items():
        print(f'  {timestamp}  --  {candidate_votes}')
