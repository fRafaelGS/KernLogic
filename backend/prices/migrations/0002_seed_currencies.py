from django.db import migrations

def seed_currencies(apps, schema_editor):
    """
    Seed all ISO 4217 currencies for all organizations.
    """
    Currency = apps.get_model('prices', 'Currency')
    Organization = apps.get_model('organizations', 'Organization')
    
    # ISO 4217 currencies
    currencies = [
        # Major global currencies
        {"iso_code": "USD", "symbol": "$", "name": "US Dollar", "decimals": 2},
        {"iso_code": "EUR", "symbol": "€", "name": "Euro", "decimals": 2},
        {"iso_code": "GBP", "symbol": "£", "name": "British Pound", "decimals": 2},
        {"iso_code": "JPY", "symbol": "¥", "name": "Japanese Yen", "decimals": 0},
        {"iso_code": "CNY", "symbol": "¥", "name": "Chinese Yuan", "decimals": 2},
        {"iso_code": "AUD", "symbol": "A$", "name": "Australian Dollar", "decimals": 2},
        {"iso_code": "CAD", "symbol": "C$", "name": "Canadian Dollar", "decimals": 2},
        {"iso_code": "CHF", "symbol": "CHF", "name": "Swiss Franc", "decimals": 2},
        {"iso_code": "HKD", "symbol": "HK$", "name": "Hong Kong Dollar", "decimals": 2},
        {"iso_code": "SGD", "symbol": "S$", "name": "Singapore Dollar", "decimals": 2},
        # Other significant currencies
        {"iso_code": "SEK", "symbol": "kr", "name": "Swedish Krona", "decimals": 2},
        {"iso_code": "NOK", "symbol": "kr", "name": "Norwegian Krone", "decimals": 2},
        {"iso_code": "DKK", "symbol": "kr", "name": "Danish Krone", "decimals": 2},
        {"iso_code": "BRL", "symbol": "R$", "name": "Brazilian Real", "decimals": 2},
        {"iso_code": "RUB", "symbol": "₽", "name": "Russian Ruble", "decimals": 2},
        {"iso_code": "INR", "symbol": "₹", "name": "Indian Rupee", "decimals": 2},
        {"iso_code": "KRW", "symbol": "₩", "name": "South Korean Won", "decimals": 0},
        {"iso_code": "MXN", "symbol": "Mex$", "name": "Mexican Peso", "decimals": 2},
        {"iso_code": "ZAR", "symbol": "R", "name": "South African Rand", "decimals": 2},
        {"iso_code": "TRY", "symbol": "₺", "name": "Turkish Lira", "decimals": 2},
        {"iso_code": "NZD", "symbol": "NZ$", "name": "New Zealand Dollar", "decimals": 2},
        {"iso_code": "PLN", "symbol": "zł", "name": "Polish Złoty", "decimals": 2},
        {"iso_code": "THB", "symbol": "฿", "name": "Thai Baht", "decimals": 2},
        {"iso_code": "IDR", "symbol": "Rp", "name": "Indonesian Rupiah", "decimals": 2},
        {"iso_code": "MYR", "symbol": "RM", "name": "Malaysian Ringgit", "decimals": 2},
        {"iso_code": "PHP", "symbol": "₱", "name": "Philippine Peso", "decimals": 2},
        {"iso_code": "AED", "symbol": "د.إ", "name": "United Arab Emirates Dirham", "decimals": 2},
        {"iso_code": "SAR", "symbol": "﷼", "name": "Saudi Riyal", "decimals": 2},
        {"iso_code": "HUF", "symbol": "Ft", "name": "Hungarian Forint", "decimals": 2},
        {"iso_code": "CZK", "symbol": "Kč", "name": "Czech Koruna", "decimals": 2},
        {"iso_code": "ILS", "symbol": "₪", "name": "Israeli New Shekel", "decimals": 2},
        {"iso_code": "CLP", "symbol": "CLP$", "name": "Chilean Peso", "decimals": 0},
        {"iso_code": "ARS", "symbol": "AR$", "name": "Argentine Peso", "decimals": 2},
        {"iso_code": "COP", "symbol": "COL$", "name": "Colombian Peso", "decimals": 2},
        {"iso_code": "PEN", "symbol": "S/", "name": "Peruvian Sol", "decimals": 2},
        {"iso_code": "EGP", "symbol": "E£", "name": "Egyptian Pound", "decimals": 2},
        {"iso_code": "PKR", "symbol": "₨", "name": "Pakistani Rupee", "decimals": 2},
        {"iso_code": "VND", "symbol": "₫", "name": "Vietnamese Dong", "decimals": 0},
        {"iso_code": "UAH", "symbol": "₴", "name": "Ukrainian Hryvnia", "decimals": 2},
        {"iso_code": "RON", "symbol": "lei", "name": "Romanian Leu", "decimals": 2},
        # Additional significant currencies
        {"iso_code": "TWD", "symbol": "NT$", "name": "New Taiwan Dollar", "decimals": 2},
        {"iso_code": "NGN", "symbol": "₦", "name": "Nigerian Naira", "decimals": 2},
        {"iso_code": "BGN", "symbol": "лв", "name": "Bulgarian Lev", "decimals": 2},
        {"iso_code": "HRK", "symbol": "kn", "name": "Croatian Kuna", "decimals": 2},
        {"iso_code": "MAD", "symbol": "د.م.", "name": "Moroccan Dirham", "decimals": 2},
        {"iso_code": "QAR", "symbol": "﷼", "name": "Qatari Riyal", "decimals": 2},
        {"iso_code": "KWD", "symbol": "د.ك", "name": "Kuwaiti Dinar", "decimals": 3},
        {"iso_code": "BHD", "symbol": ".د.ب", "name": "Bahraini Dinar", "decimals": 3}
    ]
    
    organizations = Organization.objects.all()
    
    # For each organization, create all currencies if they don't exist
    for org in organizations:
        for currency_data in currencies:
            if not Currency.objects.filter(
                iso_code=currency_data["iso_code"],
                organization=org
            ).exists():
                Currency.objects.create(
                    iso_code=currency_data["iso_code"],
                    symbol=currency_data["symbol"],
                    name=currency_data["name"],
                    decimals=currency_data["decimals"],
                    is_active=True,
                    organization=org
                )


class Migration(migrations.Migration):

    dependencies = [
        ('prices', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_currencies, migrations.RunPython.noop),
    ] 