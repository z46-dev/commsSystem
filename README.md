# Setup
1. Create a `.env` file with the following configuration:
```js
HOST=string
PORT=0
LOGINS=name|password,name|password
PRIMEN_X=0
PRIMEN_Y=0
PRIMEN_MOD=0
INBOUND_SEED=0
OUTBOUND_SEED=0
```
- Where `HOST` is the hostname of the server or the IP
- Where `PORT` is the port number of the server
- Where `LOGINS` is a comma spliced list of usernames and passwords, separated by `|`
- Where `PRIMEN_X` is the ID of a prime number in the primes list
- Where `PRIMEN_Y` is the ID of a prime number in the primes list
- Where `PRIMEN_MOD` is the ID of a prime number in the primes list
- Where `INBOUND_SEED` is a medium to medium large number that acts as a seed for generating keys
- Where `OUTBOUND_SEED` is a medium to medium large number that acts as a seed for generating keys