from fastapi import FastAPI


app = FastAPI(title="GRAB Hackathon API")


@app.get("/")
def root():
    return {"message": "Backend is running"}
