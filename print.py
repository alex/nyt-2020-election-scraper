import collections
import json
import pprint
import subprocess

FIRST_COMMIT_SHORT_SHA = '6ab578d'

AZ_INDEX = 3
GA_INDEX = 10
MI_INDEX = 22
NC_INDEX = 27
NV_INDEX = 33
PA_INDEX = 38
WI_INDEX = 48

STATE_INDEXES = [AZ_INDEX, GA_INDEX, MI_INDEX, NC_INDEX, NV_INDEX, PA_INDEX, WI_INDEX]

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
        state_blob = json['data']['races'][state_index]
        candidate1 = state_blob['candidates'][0]
        candidate2 = state_blob['candidates'][1]
        candidate1_name = candidate1['candidate_key']
        vote_diff = candidate1['votes'] - candidate2['votes']
        precints_reporting = state_blob['precincts_reporting']
        precints_total = state_blob['precincts_total']
        candidate_votes = f'{candidate1_name} leading by {vote_diff} votes (precints reporting: {precints_reporting}/{precints_total})'
        if len(summarized[state_name]) == 0 or candidate_votes != next(reversed(summarized[state_name].values())):
            summarized[state_name][timestamp] = candidate_votes


for (state, timestamped_results) in summarized.items():
    print(state)
    for (timestamp, candidate_votes) in timestamped_results.items():
        print(f'  {timestamp}  --  {candidate_votes}')
