from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON, Text
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AnalyzeResult(Base):
    __tablename__ = "analyze_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_name: Mapped[str] = mapped_column(String(255), index=True)
    summary: Mapped[str] = mapped_column(Text)
    scores: Mapped[dict] = mapped_column(JSON)
    signals: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

class RerankClass(Base):
    __tablename__ = "rerank_classes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    team: Mapped[str] = mapped_column(String(255), index=True)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    avg_points: Mapped[float] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

class RerankPlayer(Base):
    __tablename__ = "rerank_players"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("rerank_classes.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), index=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(Text, default="")