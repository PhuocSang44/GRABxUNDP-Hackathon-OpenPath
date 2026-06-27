from pydantic import BaseModel


class UserRegister(BaseModel):
    username: str
    password: str
    name: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    name: str | None = None
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse
