import json
import os
import string
import random
import psycopg2


def generate_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return "PLAN-" + "".join(random.choices(chars, k=length))


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}


def ok(data):
    return {
        "statusCode": 200,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(data),
    }


def err(status, message):
    return {
        "statusCode": status,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps({"error": message}),
    }


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handle_create(body):
    """Создать новый проект"""
    project_name = body.get("name", "").strip()
    owner_name = body.get("ownerName", "").strip()

    if not project_name:
        return err(400, "Название проекта обязательно")
    if not owner_name:
        return err(400, "Ваше имя обязательно")

    project_id = "p_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    invite_code = generate_code()

    initial_data = {
        "branches": [{"id": "b1", "name": "Основной", "city": ""}],
        "employees": [
            {
                "id": "e1",
                "name": owner_name,
                "role": "director",
                "roleLabel": "Директор",
                "branchIds": ["b1"],
                "email": "",
                "permissions": {"canViewTeamPlanner": True, "canManageTeamGoals": True},
            }
        ],
        "categories": [
            {"id": "c1", "name": "Срочно", "color": "high"},
            {"id": "c2", "name": "Важно", "color": "medium"},
            {"id": "c3", "name": "Плановое", "color": "low"},
        ],
        "tasks": [],
        "groupGoals": [],
        "groupTasks": [],
        "personalGoals": [],
        "userTaskTypes": [],
        "notes": [],
        "files": [],
        "passwords": {"e1": "admin"},
    }

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO projects (id, name, invite_code, owner_name, data) VALUES (%s, %s, %s, %s, %s)",
            (project_id, project_name, invite_code, owner_name, json.dumps(initial_data)),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return ok({
        "projectId": project_id,
        "inviteCode": invite_code,
        "name": project_name,
        "data": initial_data,
    })


def handle_join(body):
    """Присоединиться к проекту по коду"""
    invite_code = body.get("inviteCode", "").strip().upper()

    if not invite_code:
        return err(400, "Введите код проекта")

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, invite_code, data FROM projects WHERE invite_code = %s",
            (invite_code,),
        )
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()

    if not row:
        return err(404, "Проект не найден. Проверьте код.")

    pid, name, code, data = row
    parsed = data if isinstance(data, dict) else json.loads(data)

    return ok({
        "projectId": pid,
        "name": name,
        "inviteCode": code,
        "data": parsed,
    })


def handle_save(body):
    """Сохранить данные проекта"""
    project_id = body.get("projectId", "").strip()
    data = body.get("data")

    if not project_id:
        return err(400, "projectId обязателен")
    if data is None:
        return err(400, "data обязательна")

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM projects WHERE id = %s", (project_id,))
        exists = cur.fetchone()
        if not exists:
            cur.close()
            return err(404, "Проект не найден")
        cur.execute(
            "UPDATE projects SET data = %s, updated_at = NOW() WHERE id = %s",
            (json.dumps(data), project_id),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return ok({"ok": True})


def handle_load(params):
    """Загрузить данные проекта"""
    project_id = params.get("projectId", "").strip()

    if not project_id:
        return err(400, "projectId обязателен")

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, invite_code, data FROM projects WHERE id = %s",
            (project_id,),
        )
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()

    if not row:
        return err(404, "Проект не найден")

    pid, name, code, data = row
    parsed = data if isinstance(data, dict) else json.loads(data)

    return ok({
        "projectId": pid,
        "name": name,
        "inviteCode": code,
        "data": parsed,
    })


def handler(event, context):
    """API планера: создание/присоединение к проектам, загрузка/сохранение данных"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    if method == "POST":
        body = json.loads(event.get("body", "{}"))
        action = action or body.get("action", "")

        if action == "create":
            return handle_create(body)
        elif action == "join":
            return handle_join(body)
        elif action == "save":
            return handle_save(body)
        else:
            return err(400, "Неизвестное действие: " + action)

    elif method == "GET":
        if action == "load":
            return handle_load(params)
        else:
            return ok({"status": "ok", "version": "1.0"})

    return err(405, "Method not allowed")