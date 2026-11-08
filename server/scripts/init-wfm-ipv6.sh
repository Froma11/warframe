#!/usr/bin/env bash
for i in 10 11 12 13; do
  ip -6 addr show dev eth0 | grep -q "2a02:c207:2370:7155::${i}/64" || ip -6 addr add "2a02:c207:2370:7155::${i}/64" dev eth0
done
exit 0
