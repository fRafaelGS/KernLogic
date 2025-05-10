@echo off
python manage.py shell < check_price_types.py > price_types_output.txt
type price_types_output.txt 