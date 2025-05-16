from kernlogic.utils import get_user_organization

def get_locale_channel_context(request, user):
    """
    Get the current locale and channel based on request parameters,
    falling back to organization defaults.
    
    Args:
        request: The HTTP request object
        user: The authenticated user
        
    Returns:
        tuple: (locale, channel) with the resolved values
    """
    org = get_user_organization(user)
    
    # Get locale from request or fall back to organization default
    locale = request.query_params.get('locale') 
    if not locale and org:
        locale = org.default_locale
        
    # Get channel from request or fall back to organization default
    channel_code = request.query_params.get('channel')
    if not channel_code and org and org.default_channel:
        channel_code = org.default_channel.code
        
    return locale, channel_code 