import requests

files = {'file': open('C:\Users\Archana KR\Downloads\dermaco.jpg', 'rb')}
res = requests.post("http://127.0.0.1:5000/analyze", files=files)
print(res.json())