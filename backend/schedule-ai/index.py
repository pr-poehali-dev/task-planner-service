import json
import os
import urllib.request

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

SYSTEM_PROMPT = """Ты помощник для редактирования расписания тренировок фитнес-клуба.
Тебе приходит текущее расписание в формате JSON и текстовый запрос пользователя.
Ты должен вернуть обновлённое расписание в том же JSON-формате.

Формат расписания:
{
  "title": "Расписание тренировок",
  "timeSlots": [
    {
      "time": "09:00",
      "cells": [
        {"training": "Йога", "trainer": "Анна", "colorId": "green"},
        {"training": "", "trainer": "", "colorId": "none"},
        ...7 ячеек (Пн-Вс)
      ]
    }
  ],
  "address": "ул. Примерная, 1",
  "phone": "+7 999 123-45-67",
  "nickname": "@fitclub"
}

Доступные colorId: none, blue, green, yellow, pink, purple, orange, cyan.
Дни недели в cells: индекс 0=Пн, 1=Вт, 2=Ср, 3=Чт, 4=Пт, 5=Сб, 6=Вс.

Правила:
- Меняй ТОЛЬКО то, что просит пользователь
- Сохраняй все остальные данные без изменений
- Если нужно добавить новую строку времени — добавляй
- Если время совпадает — обновляй существующую строку
- Подбирай подходящие цвета если пользователь не указал
- Верни ТОЛЬКО валидный JSON расписания, без пояснений"""


def handler(event, context):
    """ИИ-помощник для обновления расписания тренировок по текстовому описанию"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    raw_body = event.get("body", "{}")
    body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    prompt = body.get("prompt", "").strip()
    schedule = body.get("schedule", "{}")

    if not prompt:
        return {
            "statusCode": 400,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Опишите изменения"}),
        }

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return {
            "statusCode": 503,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"error": "ИИ-помощник не настроен"}),
        }

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Текущее расписание:\n{schedule}\n\nЗапрос: {prompt}"},
    ]

    req_body = json.dumps({
        "model": "google/gemini-2.0-flash-001",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 4000,
    }).encode()

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=req_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )

    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode())
    content = result["choices"][0]["message"]["content"]

    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

    schedule_data = json.loads(content)

    return {
        "statusCode": 200,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps({"schedule": schedule_data}),
    }