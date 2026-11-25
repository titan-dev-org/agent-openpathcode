#!/bin/sh
LOGFILE="$1"; shift
exec "$@" 2>>"$LOGFILE"
