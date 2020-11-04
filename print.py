import json
import subprocess

FIRST_COMMIT_SHORT_SHA = '6ab578d'

def git_checkout(ref):
    subprocess.check_output(['git', 'checkout', '--quiet', ref])

def current_commit_short_sha():
    return subprocess.check_output(["git", "describe", "--always"]).strip().decode()

def fetch_all_results_json():
    jsons = []
    git_checkout('master')
    while current_commit_short_sha() != FIRST_COMMIT_SHORT_SHA:
        with open('results.json') as f:
            jsons.insert(0, json.load(f))
        git_checkout('HEAD^')
    git_checkout('master')
    return jsons

print(fetch_all_results_json())
