from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.segments import router as segments_router
from app.api.points import router as points_router

app = FastAPI(title="AccessibleMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(segments_router)
app.include_router(points_router)


@app.get("/")
def root():
    return {"message": "Backend is running"}
