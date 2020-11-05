#!/usr/bin/env bash

echo "updating now..."
curl -s 'https://static01.nyt.com/elections-assets/2020/data/api/2020-11-03/votes-remaining-page/national/president.json' | jq . > results.json
./print-battleground-state-changes > battleground-state-changes.txt
echo "done"