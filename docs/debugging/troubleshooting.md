# Troubleshooting

## Cannot read properties of undefined (reading 'id')

If on server start you get Cannot read properties of undefined (reading 'id') its highly possible that you put something what was tried to be loaded by autoload and you break recommended structure 


For instance if you put smth into main/database/common/smth-common.ts what does not have decorator related to DB. 
Put your services and helpers outside of structure ie. main/helpers