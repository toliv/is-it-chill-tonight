from fastapi import FastAPI, WebSocket
import asyncio
from typing import Dict, List
import json
from websockets.exceptions import ConnectionClosed

app = FastAPI()


active_connections: Dict[str, List[WebSocket]] = {}


@app.websocket("/chatroom")
async def websocket_endpoint(websocket: WebSocket):
    room_id = 1

    # Add the websocket connection to the active connections for the room
    if room_id not in active_connections:
        active_connections[room_id] = []
    active_connections[room_id].append(websocket)

    try:
        await websocket.accept()

        while True:
            # Receive message from the client
            message = await websocket.receive_text()

            # Construct the message data to be sent
            message_data = {
                "room_id": room_id,
                "message": message,
            }
            json_message = json.dumps(message_data)

            # Broadcast the message to all connected websockets in the room
            for connection in active_connections[room_id]:
                print(f"SENDING MESSAGE to {connection}: {json_message}")
                try:
                    await connection.send_text(json_message)
                except Exception as e:
                    active_connections[room_id].remove(connection)

    except:
        pass
