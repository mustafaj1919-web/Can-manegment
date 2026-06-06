from backend.app import create_app
app = create_app()
client = app.test_client()
resp = client.get('/trial-balance')
print('status', resp.status_code)
print('length', len(resp.data))
# Optionally print a snippet
print(resp.data.decode('utf-8')[:500])
