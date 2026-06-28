from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.segments import router as segments_router
from app.api.points import router as points_router
from app.api.reports import router as reports_router
from app.api.auth import router as auth_router
from app.api.route import router as route_router

app = FastAPI(title="AccessibleMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(segments_router)
app.include_router(points_router)
app.include_router(reports_router)
app.include_router(auth_router)
app.include_router(route_router)


@app.get("/")
def root():
    return {"message": "Backend is running"}
