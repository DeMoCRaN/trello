--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Debian 14.18-1.pgdg120+1)
-- Dumped by pg_dump version 14.18

-- Started on 2025-12-16 00:17:57 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: democran
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO democran;

--
-- TOC entry 3616 (class 0 OID 0)
-- Dependencies: 3
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: democran
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 255 (class 1255 OID 17025)
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  changed_columns TEXT[] := '{}';
  column_name TEXT;
  old_json JSONB;
  new_json JSONB;
  audit_user_id INTEGER;
BEGIN
  -- Определяем операцию и подготавливаем данные
  IF TG_OP = 'INSERT' THEN
    old_json := NULL;
    new_json := to_jsonb(NEW);
    changed_columns := ARRAY(SELECT jsonb_object_keys(to_jsonb(NEW)));
    
    -- Автоматическое определение пользователя для INSERT
    audit_user_id := CASE TG_TABLE_NAME
      WHEN 'users' THEN NEW.id  -- Для создания пользователя
      WHEN 'tasks' THEN NEW.creator_id
      WHEN 'assignments' THEN NEW.creator_id
      WHEN 'task_comments' THEN NEW.user_id
      WHEN 'assignment_members' THEN NEW.invited_by
      ELSE NULL
    END;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Находим измененные колонки
    FOR column_name IN 
      SELECT key FROM jsonb_each(to_jsonb(OLD)) 
      WHERE value IS DISTINCT FROM to_jsonb(NEW)->key
      UNION
      SELECT key FROM jsonb_each(to_jsonb(NEW)) 
      WHERE value IS DISTINCT FROM to_jsonb(OLD)->key
    LOOP
      changed_columns := array_append(changed_columns, column_name);
    END LOOP;
    
    -- Автоматическое определение пользователя для UPDATE
    audit_user_id := CASE TG_TABLE_NAME
      WHEN 'tasks' THEN COALESCE(
        current_setting('app.current_user_id', TRUE)::INTEGER,
        NEW.creator_id,
        OLD.creator_id
      )
      WHEN 'assignments' THEN COALESCE(
        current_setting('app.current_user_id', TRUE)::INTEGER,
        NEW.creator_id,
        OLD.creator_id
      )
      WHEN 'task_comments' THEN COALESCE(
        current_setting('app.current_user_id', TRUE)::INTEGER,
        NEW.user_id,
        OLD.user_id
      )
      WHEN 'assignment_members' THEN COALESCE(
        current_setting('app.current_user_id', TRUE)::INTEGER,
        NEW.invited_by,
        OLD.invited_by
      )
      ELSE current_setting('app.current_user_id', TRUE)::INTEGER
    END;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    new_json := NULL;
    changed_columns := ARRAY(SELECT jsonb_object_keys(to_jsonb(OLD)));
    
    -- Автоматическое определение пользователя для DELETE
    audit_user_id := CASE TG_TABLE_NAME
      WHEN 'tasks' THEN OLD.creator_id
      WHEN 'assignments' THEN OLD.creator_id
      WHEN 'task_comments' THEN OLD.user_id
      WHEN 'assignment_members' THEN OLD.invited_by
      ELSE NULL
    END;
  END IF;

  -- Если пользователь не определен, пытаемся получить из сессии
  IF audit_user_id IS NULL THEN
    audit_user_id := current_setting('app.current_user_id', TRUE)::INTEGER;
  END IF;

  -- Вставляем запись в аудит лог
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_columns,
    user_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_json,
    new_json,
    changed_columns,
    audit_user_id,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION public.audit_trigger_function() OWNER TO democran;

--
-- TOC entry 256 (class 1255 OID 17033)
-- Name: get_audit_history(character varying, integer); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.get_audit_history(p_table_name character varying, p_record_id integer) RETURNS TABLE(operation character varying, old_data jsonb, new_data jsonb, changed_columns text[], user_id integer, username character varying, created_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.operation,
    al.old_data,
    al.new_data,
    al.changed_columns,
    al.user_id,
    u.username,
    al.created_at
  FROM audit_log al
  LEFT JOIN users u ON al.user_id = u.id
  WHERE al.table_name = p_table_name 
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$;


ALTER FUNCTION public.get_audit_history(p_table_name character varying, p_record_id integer) OWNER TO democran;

--
-- TOC entry 258 (class 1255 OID 17335)
-- Name: get_commits_by_task(integer); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.get_commits_by_task(task_id_param integer) RETURNS TABLE(id integer, hash character varying, message text, author_name character varying, author_email character varying, commit_date timestamp without time zone, repository_name character varying, branch_name character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.hash,
    c.message,
    c.author_name,
    c.author_email,
    c.commit_date,
    r.name,
    b.name
  FROM commits c
  JOIN repositories r ON c.repository_id = r.id
  LEFT JOIN branches b ON c.branch_id = b.id
  WHERE task_id_param = ANY(c.task_references)
  ORDER BY c.commit_date DESC;
END;
$$;


ALTER FUNCTION public.get_commits_by_task(task_id_param integer) OWNER TO democran;

--
-- TOC entry 261 (class 1255 OID 17370)
-- Name: get_task_attachments(integer, integer, integer, boolean); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.get_task_attachments(p_task_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_include_deleted boolean DEFAULT false) RETURNS TABLE(attachment_id integer, filename character varying, original_filename character varying, file_size bigint, mime_type character varying, description text, upload_date timestamp without time zone, uploader_id integer, uploader_username character varying, is_deleted boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ta.id AS attachment_id,
        ta.filename,
        ta.original_filename,
        ta.file_size,
        ta.mime_type,
        ta.description,
        ta.upload_date,
        ta.user_id AS uploader_id,
        u.username AS uploader_username,
        ta.is_deleted
    FROM public.task_attachments ta
    JOIN public.users u ON ta.user_id = u.id
    WHERE 
        ta.task_id = p_task_id
        AND (p_include_deleted OR ta.is_deleted = FALSE)
    ORDER BY ta.upload_date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.get_task_attachments(p_task_id integer, p_limit integer, p_offset integer, p_include_deleted boolean) OWNER TO democran;

--
-- TOC entry 262 (class 1255 OID 17371)
-- Name: get_task_attachments_stats(integer); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.get_task_attachments_stats(p_task_id integer) RETURNS TABLE(total_count bigint, total_size bigint, file_types jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_count,
        COALESCE(SUM(file_size), 0)::BIGINT AS total_size,
        jsonb_object_agg(
            COALESCE(mime_type, 'unknown'),
            file_count
        ) AS file_types
    FROM (
        SELECT 
            COALESCE(mime_type, 'unknown') AS mime_type,
            COUNT(*) AS file_count
        FROM public.task_attachments
        WHERE 
            task_id = p_task_id 
            AND is_deleted = FALSE
        GROUP BY mime_type
    ) AS type_counts;
END;
$$;


ALTER FUNCTION public.get_task_attachments_stats(p_task_id integer) OWNER TO democran;

--
-- TOC entry 257 (class 1255 OID 17034)
-- Name: get_user_audit_log(integer, integer); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.get_user_audit_log(p_user_id integer, p_days integer DEFAULT 30) RETURNS TABLE(table_name character varying, record_id integer, operation character varying, changed_columns text[], created_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.table_name,
    al.record_id,
    al.operation,
    al.changed_columns,
    al.created_at
  FROM audit_log al
  WHERE al.user_id = p_user_id
    AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY al.created_at DESC;
END;
$$;


ALTER FUNCTION public.get_user_audit_log(p_user_id integer, p_days integer) OWNER TO democran;

--
-- TOC entry 244 (class 1255 OID 17327)
-- Name: parse_task_references(text); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.parse_task_references(commit_message text) RETURNS integer[]
    LANGUAGE plpgsql
    AS $$
DECLARE
  task_ids INTEGER[] := ARRAY[]::INTEGER[];
  matches TEXT[];
  match TEXT;
  task_id INTEGER;
BEGIN
  -- Ищем паттерны вида #123 или Task: 123 или task 123
  SELECT array_agg(regexp_matches[1]) INTO matches
  FROM regexp_matches(commit_message, '(?:#|Task:\s*|task\s+)(\d+)', 'gi');

  IF matches IS NOT NULL THEN
    FOREACH match IN ARRAY matches LOOP
      BEGIN
        task_id := match::INTEGER;
        task_ids := array_append(task_ids, task_id);
      EXCEPTION WHEN OTHERS THEN
        -- Пропускаем некорректные ID
        CONTINUE;
      END;
    END LOOP;
  END IF;

  RETURN task_ids;
END;
$$;


ALTER FUNCTION public.parse_task_references(commit_message text) OWNER TO democran;

--
-- TOC entry 254 (class 1255 OID 17026)
-- Name: set_current_user(integer); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.set_current_user(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, FALSE);
END;
$$;


ALTER FUNCTION public.set_current_user(user_id integer) OWNER TO democran;

--
-- TOC entry 260 (class 1255 OID 17369)
-- Name: soft_delete_task_attachment(integer, integer); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.soft_delete_task_attachment(p_attachment_id integer, p_user_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.task_attachments
    SET 
        is_deleted = TRUE,
        deleted_at = NOW()
    WHERE 
        id = p_attachment_id 
        AND user_id = p_user_id
        AND is_deleted = FALSE;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.soft_delete_task_attachment(p_attachment_id integer, p_user_id integer) OWNER TO democran;

--
-- TOC entry 259 (class 1255 OID 17367)
-- Name: task_attachments_audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.task_attachments_audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Вставляем запись в аудит лог
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        changed_columns,
        user_id,
        created_at
    ) VALUES (
        'task_attachments',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        ARRAY[]::TEXT[], -- Можно расширить для определения измененных колонок
        COALESCE(
            current_setting('app.current_user_id', TRUE)::INTEGER,
            NEW.user_id,
            OLD.user_id
        ),
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.task_attachments_audit_trigger_function() OWNER TO democran;

--
-- TOC entry 245 (class 1255 OID 17328)
-- Name: trigger_parse_commit_task_references(); Type: FUNCTION; Schema: public; Owner: democran
--

CREATE FUNCTION public.trigger_parse_commit_task_references() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Парсим ссылки на задачи из сообщения коммита
  NEW.task_references := parse_task_references(NEW.message);

  -- Создаем связи коммит-задача
  IF NEW.task_references IS NOT NULL AND array_length(NEW.task_references, 1) > 0 THEN
    INSERT INTO commit_task_links (commit_id, task_id, reference_type)
    SELECT NEW.id, unnest(NEW.task_references), 'message'
    ON CONFLICT (commit_id, task_id, reference_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_parse_commit_task_references() OWNER TO democran;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 214 (class 1259 OID 16509)
-- Name: assignments; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    creator_id integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.assignments OWNER TO democran;

--
-- TOC entry 239 (class 1259 OID 17342)
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.task_attachments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    filename character varying(500) NOT NULL,
    original_filename character varying(500) NOT NULL,
    file_path character varying(1000) NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    mime_type character varying(255),
    description text,
    upload_date timestamp without time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    CONSTRAINT check_file_size CHECK (((file_size >= 0) AND (file_size <= 52428800))),
    CONSTRAINT check_mime_type CHECK (((mime_type IS NULL) OR ((mime_type)::text ~ '^[a-zA-Z0-9!#$%^&\*_\+-\.]+\/[a-zA-Z0-9!#$%^&\*_\+-\.]+$'::text)))
);


ALTER TABLE public.task_attachments OWNER TO democran;

--
-- TOC entry 3617 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE task_attachments; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON TABLE public.task_attachments IS 'Хранит файлы, прикрепленные к задачам. Поддерживает версионирование и мягкое удаление.';


--
-- TOC entry 3618 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.id; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.id IS 'Уникальный идентификатор вложения';


--
-- TOC entry 3619 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.task_id; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.task_id IS 'Ссылка на задачу, к которой прикреплен файл';


--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.user_id; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.user_id IS 'Пользователь, загрузивший файл';


--
-- TOC entry 3621 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.filename; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.filename IS 'Уникальное имя файла в системе (сгенерированное)';


--
-- TOC entry 3622 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.original_filename; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.original_filename IS 'Оригинальное имя файла (как у пользователя)';


--
-- TOC entry 3623 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.file_path; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.file_path IS 'Путь к файлу в файловой системе или хранилище';


--
-- TOC entry 3624 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.file_size; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.file_size IS 'Размер файла в байтах';


--
-- TOC entry 3625 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.mime_type; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.mime_type IS 'MIME-тип файла (например, image/png, application/pdf)';


--
-- TOC entry 3626 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.description; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.description IS 'Описание файла, добавленное пользователем';


--
-- TOC entry 3627 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.upload_date; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.upload_date IS 'Дата и время загрузки файла';


--
-- TOC entry 3628 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.is_deleted; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.is_deleted IS 'Флаг мягкого удаления (true - удален, false - активен)';


--
-- TOC entry 3629 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN task_attachments.deleted_at; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON COLUMN public.task_attachments.deleted_at IS 'Дата и время удаления файла';


--
-- TOC entry 220 (class 1259 OID 16538)
-- Name: tasks; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    assignment_id integer,
    title character varying(255) NOT NULL,
    description text,
    deadline timestamp without time zone,
    creator_id integer NOT NULL,
    assignee_id integer,
    status_id integer NOT NULL,
    priority_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    seen_at timestamp without time zone,
    in_progress_since timestamp with time zone,
    work_duration integer DEFAULT 0,
    progress_percentage double precision DEFAULT 0
);


ALTER TABLE public.tasks OWNER TO democran;

--
-- TOC entry 212 (class 1259 OID 16489)
-- Name: users; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255),
    password character varying(255) NOT NULL,
    role_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    github_id bigint,
    github_username character varying(255),
    github_token text,
    github_connected boolean DEFAULT false,
    name character varying(255)
);


ALTER TABLE public.users OWNER TO democran;

--
-- TOC entry 240 (class 1259 OID 17377)
-- Name: active_task_attachments; Type: VIEW; Schema: public; Owner: democran
--

CREATE VIEW public.active_task_attachments AS
 SELECT ta.id,
    ta.task_id,
    ta.user_id,
    ta.filename,
    ta.original_filename,
    ta.file_path,
    ta.file_size,
    ta.mime_type,
    ta.description,
    ta.upload_date,
    ta.is_deleted,
    ta.deleted_at,
    u.username AS uploader_username,
    u.email AS uploader_email,
    t.title AS task_title,
    a.title AS assignment_title
   FROM (((public.task_attachments ta
     JOIN public.users u ON ((ta.user_id = u.id)))
     JOIN public.tasks t ON ((ta.task_id = t.id)))
     LEFT JOIN public.assignments a ON ((t.assignment_id = a.id)))
  WHERE (ta.is_deleted = false);


ALTER TABLE public.active_task_attachments OWNER TO democran;

--
-- TOC entry 3630 (class 0 OID 0)
-- Dependencies: 240
-- Name: VIEW active_task_attachments; Type: COMMENT; Schema: public; Owner: democran
--

COMMENT ON VIEW public.active_task_attachments IS 'Представление с полной информацией о активных вложениях к задачам';


--
-- TOC entry 224 (class 1259 OID 16708)
-- Name: archived_tasks; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.archived_tasks (
    id integer NOT NULL,
    assignment_id integer,
    title character varying(255) NOT NULL,
    description text,
    deadline timestamp without time zone,
    creator_id integer NOT NULL,
    assignee_id integer,
    status_id integer NOT NULL,
    priority_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    seen_at timestamp without time zone,
    in_progress_since timestamp without time zone,
    work_duration integer DEFAULT 0,
    progress_percentage integer DEFAULT 0,
    deleted_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.archived_tasks OWNER TO democran;

--
-- TOC entry 223 (class 1259 OID 16707)
-- Name: archived_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.archived_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.archived_tasks_id_seq OWNER TO democran;

--
-- TOC entry 3631 (class 0 OID 0)
-- Dependencies: 223
-- Name: archived_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.archived_tasks_id_seq OWNED BY public.archived_tasks.id;


--
-- TOC entry 226 (class 1259 OID 16747)
-- Name: assignment_members; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.assignment_members (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    user_id integer NOT NULL,
    invited_by integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    invited_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    CONSTRAINT assignment_members_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.assignment_members OWNER TO democran;

--
-- TOC entry 225 (class 1259 OID 16746)
-- Name: assignment_members_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.assignment_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignment_members_id_seq OWNER TO democran;

--
-- TOC entry 3632 (class 0 OID 0)
-- Dependencies: 225
-- Name: assignment_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.assignment_members_id_seq OWNED BY public.assignment_members.id;


--
-- TOC entry 213 (class 1259 OID 16508)
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignments_id_seq OWNER TO democran;

--
-- TOC entry 3633 (class 0 OID 0)
-- Dependencies: 213
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- TOC entry 228 (class 1259 OID 17005)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id integer NOT NULL,
    operation character varying(10) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_columns text[],
    user_id integer,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT audit_log_operation_check CHECK (((operation)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);


ALTER TABLE public.audit_log OWNER TO democran;

--
-- TOC entry 227 (class 1259 OID 17004)
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_log_id_seq OWNER TO democran;

--
-- TOC entry 3634 (class 0 OID 0)
-- Dependencies: 227
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- TOC entry 232 (class 1259 OID 17258)
-- Name: branches; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    repository_id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_default boolean DEFAULT false,
    last_commit_hash character varying(40),
    last_commit_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.branches OWNER TO democran;

--
-- TOC entry 231 (class 1259 OID 17257)
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.branches_id_seq OWNER TO democran;

--
-- TOC entry 3635 (class 0 OID 0)
-- Dependencies: 231
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- TOC entry 236 (class 1259 OID 17298)
-- Name: commit_task_links; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.commit_task_links (
    id integer NOT NULL,
    commit_id integer NOT NULL,
    task_id integer NOT NULL,
    reference_type character varying(50) DEFAULT 'message'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commit_task_links OWNER TO democran;

--
-- TOC entry 235 (class 1259 OID 17297)
-- Name: commit_task_links_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.commit_task_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commit_task_links_id_seq OWNER TO democran;

--
-- TOC entry 3636 (class 0 OID 0)
-- Dependencies: 235
-- Name: commit_task_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.commit_task_links_id_seq OWNED BY public.commit_task_links.id;


--
-- TOC entry 234 (class 1259 OID 17275)
-- Name: commits; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.commits (
    id integer NOT NULL,
    repository_id integer NOT NULL,
    branch_id integer,
    hash character varying(40) NOT NULL,
    author_name character varying(255),
    author_email character varying(255),
    message text NOT NULL,
    commit_date timestamp without time zone NOT NULL,
    parent_hashes text[],
    task_references integer[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commits OWNER TO democran;

--
-- TOC entry 233 (class 1259 OID 17274)
-- Name: commits_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.commits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commits_id_seq OWNER TO democran;

--
-- TOC entry 3637 (class 0 OID 0)
-- Dependencies: 233
-- Name: commits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.commits_id_seq OWNED BY public.commits.id;


--
-- TOC entry 237 (class 1259 OID 17330)
-- Name: commits_with_tasks; Type: VIEW; Schema: public; Owner: democran
--

CREATE VIEW public.commits_with_tasks AS
SELECT
    NULL::integer AS id,
    NULL::integer AS repository_id,
    NULL::integer AS branch_id,
    NULL::character varying(40) AS hash,
    NULL::character varying(255) AS author_name,
    NULL::character varying(255) AS author_email,
    NULL::text AS message,
    NULL::timestamp without time zone AS commit_date,
    NULL::text[] AS parent_hashes,
    NULL::integer[] AS task_references,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at,
    NULL::character varying(255) AS repository_name,
    NULL::character varying(500) AS repository_url,
    NULL::character varying(255) AS branch_name,
    NULL::integer[] AS linked_task_ids,
    NULL::character varying[] AS linked_task_titles;


ALTER TABLE public.commits_with_tasks OWNER TO democran;

--
-- TOC entry 230 (class 1259 OID 17234)
-- Name: repositories; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.repositories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    description text,
    assignment_id integer,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


ALTER TABLE public.repositories OWNER TO democran;

--
-- TOC entry 229 (class 1259 OID 17233)
-- Name: repositories_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.repositories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.repositories_id_seq OWNER TO democran;

--
-- TOC entry 3638 (class 0 OID 0)
-- Dependencies: 229
-- Name: repositories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.repositories_id_seq OWNED BY public.repositories.id;


--
-- TOC entry 210 (class 1259 OID 16480)
-- Name: roles; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO democran;

--
-- TOC entry 209 (class 1259 OID 16479)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO democran;

--
-- TOC entry 3639 (class 0 OID 0)
-- Dependencies: 209
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 238 (class 1259 OID 17341)
-- Name: task_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.task_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.task_attachments_id_seq OWNER TO democran;

--
-- TOC entry 3640 (class 0 OID 0)
-- Dependencies: 238
-- Name: task_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.task_attachments_id_seq OWNED BY public.task_attachments.id;


--
-- TOC entry 222 (class 1259 OID 16608)
-- Name: task_comments; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.task_comments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    text text NOT NULL,
    is_read boolean DEFAULT false
);


ALTER TABLE public.task_comments OWNER TO democran;

--
-- TOC entry 221 (class 1259 OID 16607)
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.task_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.task_comments_id_seq OWNER TO democran;

--
-- TOC entry 3641 (class 0 OID 0)
-- Dependencies: 221
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- TOC entry 218 (class 1259 OID 16529)
-- Name: task_priorities; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.task_priorities (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.task_priorities OWNER TO democran;

--
-- TOC entry 217 (class 1259 OID 16528)
-- Name: task_priorities_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.task_priorities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.task_priorities_id_seq OWNER TO democran;

--
-- TOC entry 3642 (class 0 OID 0)
-- Dependencies: 217
-- Name: task_priorities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.task_priorities_id_seq OWNED BY public.task_priorities.id;


--
-- TOC entry 216 (class 1259 OID 16520)
-- Name: task_statuses; Type: TABLE; Schema: public; Owner: democran
--

CREATE TABLE public.task_statuses (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.task_statuses OWNER TO democran;

--
-- TOC entry 215 (class 1259 OID 16519)
-- Name: task_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.task_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.task_statuses_id_seq OWNER TO democran;

--
-- TOC entry 3643 (class 0 OID 0)
-- Dependencies: 215
-- Name: task_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.task_statuses_id_seq OWNED BY public.task_statuses.id;


--
-- TOC entry 219 (class 1259 OID 16537)
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tasks_id_seq OWNER TO democran;

--
-- TOC entry 3644 (class 0 OID 0)
-- Dependencies: 219
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- TOC entry 211 (class 1259 OID 16488)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: democran
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO democran;

--
-- TOC entry 3645 (class 0 OID 0)
-- Dependencies: 211
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: democran
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3298 (class 2604 OID 16711)
-- Name: archived_tasks id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks ALTER COLUMN id SET DEFAULT nextval('public.archived_tasks_id_seq'::regclass);


--
-- TOC entry 3304 (class 2604 OID 16750)
-- Name: assignment_members id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignment_members ALTER COLUMN id SET DEFAULT nextval('public.assignment_members_id_seq'::regclass);


--
-- TOC entry 3284 (class 2604 OID 16512)
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- TOC entry 3308 (class 2604 OID 17008)
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- TOC entry 3315 (class 2604 OID 17261)
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- TOC entry 3322 (class 2604 OID 17301)
-- Name: commit_task_links id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commit_task_links ALTER COLUMN id SET DEFAULT nextval('public.commit_task_links_id_seq'::regclass);


--
-- TOC entry 3319 (class 2604 OID 17278)
-- Name: commits id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commits ALTER COLUMN id SET DEFAULT nextval('public.commits_id_seq'::regclass);


--
-- TOC entry 3311 (class 2604 OID 17237)
-- Name: repositories id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.repositories ALTER COLUMN id SET DEFAULT nextval('public.repositories_id_seq'::regclass);


--
-- TOC entry 3279 (class 2604 OID 16483)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3325 (class 2604 OID 17345)
-- Name: task_attachments id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_attachments ALTER COLUMN id SET DEFAULT nextval('public.task_attachments_id_seq'::regclass);


--
-- TOC entry 3295 (class 2604 OID 16611)
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- TOC entry 3289 (class 2604 OID 16532)
-- Name: task_priorities id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_priorities ALTER COLUMN id SET DEFAULT nextval('public.task_priorities_id_seq'::regclass);


--
-- TOC entry 3288 (class 2604 OID 16523)
-- Name: task_statuses id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_statuses ALTER COLUMN id SET DEFAULT nextval('public.task_statuses_id_seq'::regclass);


--
-- TOC entry 3290 (class 2604 OID 16541)
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- TOC entry 3280 (class 2604 OID 16492)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3596 (class 0 OID 16708)
-- Dependencies: 224
-- Data for Name: archived_tasks; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.archived_tasks (id, assignment_id, title, description, deadline, creator_id, assignee_id, status_id, priority_id, created_at, updated_at, seen_at, in_progress_since, work_duration, progress_percentage, deleted_at) FROM stdin;
174	26	123412	31231231	\N	2	1	1	1	2025-09-09 21:43:12.884993	2025-09-09 21:43:12.884993	\N	\N	0	0	2025-09-10 11:18:02.246829
173	26	423	\N	\N	2	1	1	1	2025-09-09 21:12:18.329626	2025-09-09 21:12:18.329626	\N	\N	0	0	2025-09-10 11:18:03.169
165	24	123@mail.com	123@mail.com	2025-08-08 20:44:00	1	1	3	1	2025-08-08 15:44:36.26743	2025-08-19 16:33:39.220407	\N	\N	953311	1	2025-08-19 16:44:44.088747
\.


--
-- TOC entry 3598 (class 0 OID 16747)
-- Dependencies: 226
-- Data for Name: assignment_members; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.assignment_members (id, assignment_id, user_id, invited_by, status, invited_at, responded_at) FROM stdin;
6	26	1	2	accepted	2025-09-10 11:16:41.966798	2025-09-10 11:16:50.921087
8	23	1	2	rejected	2025-09-10 11:19:37.370249	2025-09-10 11:19:47.646583
7	32	2	1	accepted	2025-09-10 11:17:13.073584	2025-09-10 11:20:57.978508
9	24	2	1	accepted	2025-09-10 14:55:19.23629	2025-09-10 14:55:32.968051
\.


--
-- TOC entry 3586 (class 0 OID 16509)
-- Dependencies: 214
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.assignments (id, title, description, created_at, updated_at, creator_id) FROM stdin;
23	1231dwqa	\N	2025-07-17 22:11:22.446069	2025-07-17 22:11:22.446069	2
24	1231	\N	2025-07-18 14:07:01.758586	2025-07-18 14:07:01.758586	1
26	123	\N	2025-08-08 13:15:32.003974	2025-08-08 13:15:32.003974	2
31	123	\N	2025-08-19 17:07:33.634058	2025-08-19 17:07:33.634058	1
32	123	123	2025-08-19 17:41:06.186055	2025-08-19 17:41:06.186055	1
\.


--
-- TOC entry 3600 (class 0 OID 17005)
-- Dependencies: 228
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.audit_log (id, table_name, record_id, operation, old_data, new_data, changed_columns, user_id, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- TOC entry 3604 (class 0 OID 17258)
-- Dependencies: 232
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.branches (id, repository_id, name, is_default, last_commit_hash, last_commit_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3608 (class 0 OID 17298)
-- Dependencies: 236
-- Data for Name: commit_task_links; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.commit_task_links (id, commit_id, task_id, reference_type, created_at) FROM stdin;
\.


--
-- TOC entry 3606 (class 0 OID 17275)
-- Dependencies: 234
-- Data for Name: commits; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.commits (id, repository_id, branch_id, hash, author_name, author_email, message, commit_date, parent_hashes, task_references, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3602 (class 0 OID 17234)
-- Dependencies: 230
-- Data for Name: repositories; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.repositories (id, name, url, description, assignment_id, created_by, created_at, updated_at, is_active) FROM stdin;
\.


--
-- TOC entry 3582 (class 0 OID 16480)
-- Dependencies: 210
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.roles (id, name) FROM stdin;
1	admin
2	user
3	guest
\.


--
-- TOC entry 3610 (class 0 OID 17342)
-- Dependencies: 239
-- Data for Name: task_attachments; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.task_attachments (id, task_id, user_id, filename, original_filename, file_path, file_size, mime_type, description, upload_date, is_deleted, deleted_at) FROM stdin;
\.


--
-- TOC entry 3594 (class 0 OID 16608)
-- Dependencies: 222
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.task_comments (id, task_id, user_id, created_at, text, is_read) FROM stdin;
70	176	2	2025-09-10 14:59:46.597243	sfdfsb	f
\.


--
-- TOC entry 3590 (class 0 OID 16529)
-- Dependencies: 218
-- Data for Name: task_priorities; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.task_priorities (id, name) FROM stdin;
1	low
2	medium
3	high
\.


--
-- TOC entry 3588 (class 0 OID 16520)
-- Dependencies: 216
-- Data for Name: task_statuses; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.task_statuses (id, name) FROM stdin;
1	new
2	in_progress
3	done
\.


--
-- TOC entry 3592 (class 0 OID 16538)
-- Dependencies: 220
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.tasks (id, assignment_id, title, description, deadline, creator_id, assignee_id, status_id, priority_id, created_at, updated_at, seen_at, in_progress_since, work_duration, progress_percentage) FROM stdin;
176	32	123	12312	\N	1	2	3	1	2025-09-10 14:59:00.247548	2025-09-10 15:37:17.814319	\N	\N	2277	0
177	26	авыыва	аыввапы	2025-11-08 19:54:00	2	1	3	1	2025-11-08 15:55:05.356721	2025-11-08 16:34:53.825977	\N	\N	6	16.654595677437122
172	26	123	123	2025-09-09 18:38:00	2	1	3	1	2025-09-09 13:38:10.804395	2025-09-09 20:57:38.042465	\N	\N	0	0.04001846441608619
\.


--
-- TOC entry 3584 (class 0 OID 16489)
-- Dependencies: 212
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: democran
--

COPY public.users (id, username, email, password, role_id, created_at, updated_at, github_id, github_username, github_token, github_connected, name) FROM stdin;
1	123	123@mail.com	$2a$10$kZ2vGfKJl.LnUt.uV5M6LuybE2.oNqFwZShqm4x9i9ocvk.a3nz.G	2	2025-07-07 11:43:15.574285	2025-07-07 11:43:15.574285	\N	\N	\N	f	\N
2	321	321@gmail.com	$2a$10$kZ2vGfKJl.LnUt.uV5M6LuybE2.oNqFwZShqm4x9i9ocvk.a3nz.G	2	2025-07-07 12:29:27.031078	2025-07-07 12:29:27.031078	\N	\N	\N	f	\N
\.


--
-- TOC entry 3646 (class 0 OID 0)
-- Dependencies: 223
-- Name: archived_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.archived_tasks_id_seq', 1, false);


--
-- TOC entry 3647 (class 0 OID 0)
-- Dependencies: 225
-- Name: assignment_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.assignment_members_id_seq', 9, true);


--
-- TOC entry 3648 (class 0 OID 0)
-- Dependencies: 213
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.assignments_id_seq', 33, true);


--
-- TOC entry 3649 (class 0 OID 0)
-- Dependencies: 227
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- TOC entry 3650 (class 0 OID 0)
-- Dependencies: 231
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.branches_id_seq', 1, false);


--
-- TOC entry 3651 (class 0 OID 0)
-- Dependencies: 235
-- Name: commit_task_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.commit_task_links_id_seq', 1, false);


--
-- TOC entry 3652 (class 0 OID 0)
-- Dependencies: 233
-- Name: commits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.commits_id_seq', 1, false);


--
-- TOC entry 3653 (class 0 OID 0)
-- Dependencies: 229
-- Name: repositories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.repositories_id_seq', 1, false);


--
-- TOC entry 3654 (class 0 OID 0)
-- Dependencies: 209
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 3655 (class 0 OID 0)
-- Dependencies: 238
-- Name: task_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.task_attachments_id_seq', 1, false);


--
-- TOC entry 3656 (class 0 OID 0)
-- Dependencies: 221
-- Name: task_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.task_comments_id_seq', 70, true);


--
-- TOC entry 3657 (class 0 OID 0)
-- Dependencies: 217
-- Name: task_priorities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.task_priorities_id_seq', 3, true);


--
-- TOC entry 3658 (class 0 OID 0)
-- Dependencies: 215
-- Name: task_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.task_statuses_id_seq', 3, true);


--
-- TOC entry 3659 (class 0 OID 0)
-- Dependencies: 219
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.tasks_id_seq', 177, true);


--
-- TOC entry 3660 (class 0 OID 0)
-- Dependencies: 211
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: democran
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- TOC entry 3358 (class 2606 OID 16720)
-- Name: archived_tasks archived_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3360 (class 2606 OID 16757)
-- Name: assignment_members assignment_members_assignment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_assignment_id_user_id_key UNIQUE (assignment_id, user_id);


--
-- TOC entry 3362 (class 2606 OID 16755)
-- Name: assignment_members assignment_members_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3344 (class 2606 OID 16518)
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3367 (class 2606 OID 17014)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3380 (class 2606 OID 17266)
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- TOC entry 3382 (class 2606 OID 17268)
-- Name: branches branches_repository_id_name_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_repository_id_name_key UNIQUE (repository_id, name);


--
-- TOC entry 3393 (class 2606 OID 17307)
-- Name: commit_task_links commit_task_links_commit_id_task_id_reference_type_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_commit_id_task_id_reference_type_key UNIQUE (commit_id, task_id, reference_type);


--
-- TOC entry 3395 (class 2606 OID 17305)
-- Name: commit_task_links commit_task_links_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_pkey PRIMARY KEY (id);


--
-- TOC entry 3385 (class 2606 OID 17286)
-- Name: commits commits_hash_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_hash_key UNIQUE (hash);


--
-- TOC entry 3387 (class 2606 OID 17284)
-- Name: commits commits_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_pkey PRIMARY KEY (id);


--
-- TOC entry 3376 (class 2606 OID 17244)
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- TOC entry 3378 (class 2606 OID 17246)
-- Name: repositories repositories_url_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_url_key UNIQUE (url);


--
-- TOC entry 3332 (class 2606 OID 16487)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 3334 (class 2606 OID 16485)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3404 (class 2606 OID 17352)
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 3356 (class 2606 OID 16616)
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- TOC entry 3350 (class 2606 OID 16536)
-- Name: task_priorities task_priorities_name_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_priorities
    ADD CONSTRAINT task_priorities_name_key UNIQUE (name);


--
-- TOC entry 3352 (class 2606 OID 16534)
-- Name: task_priorities task_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_priorities
    ADD CONSTRAINT task_priorities_pkey PRIMARY KEY (id);


--
-- TOC entry 3346 (class 2606 OID 16527)
-- Name: task_statuses task_statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT task_statuses_name_key UNIQUE (name);


--
-- TOC entry 3348 (class 2606 OID 16525)
-- Name: task_statuses task_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT task_statuses_pkey PRIMARY KEY (id);


--
-- TOC entry 3354 (class 2606 OID 16547)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3406 (class 2606 OID 17375)
-- Name: task_attachments unique_filename; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT unique_filename UNIQUE (filename) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 3336 (class 2606 OID 16502)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3338 (class 2606 OID 17340)
-- Name: users users_github_id_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_github_id_key UNIQUE (github_id);


--
-- TOC entry 3340 (class 2606 OID 16498)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3342 (class 2606 OID 16500)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3363 (class 1259 OID 16773)
-- Name: idx_assignment_members_assignment_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_assignment_members_assignment_id ON public.assignment_members USING btree (assignment_id);


--
-- TOC entry 3364 (class 1259 OID 16775)
-- Name: idx_assignment_members_status; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_assignment_members_status ON public.assignment_members USING btree (status);


--
-- TOC entry 3365 (class 1259 OID 16774)
-- Name: idx_assignment_members_user_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_assignment_members_user_id ON public.assignment_members USING btree (user_id);


--
-- TOC entry 3368 (class 1259 OID 17024)
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- TOC entry 3369 (class 1259 OID 17022)
-- Name: idx_audit_log_operation; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_audit_log_operation ON public.audit_log USING btree (operation);


--
-- TOC entry 3370 (class 1259 OID 17021)
-- Name: idx_audit_log_record_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_audit_log_record_id ON public.audit_log USING btree (record_id);


--
-- TOC entry 3371 (class 1259 OID 17020)
-- Name: idx_audit_log_table_name; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name);


--
-- TOC entry 3372 (class 1259 OID 17023)
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- TOC entry 3383 (class 1259 OID 17320)
-- Name: idx_branches_repository_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_branches_repository_id ON public.branches USING btree (repository_id);


--
-- TOC entry 3396 (class 1259 OID 17325)
-- Name: idx_commit_task_links_commit_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_commit_task_links_commit_id ON public.commit_task_links USING btree (commit_id);


--
-- TOC entry 3397 (class 1259 OID 17326)
-- Name: idx_commit_task_links_task_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_commit_task_links_task_id ON public.commit_task_links USING btree (task_id);


--
-- TOC entry 3388 (class 1259 OID 17322)
-- Name: idx_commits_branch_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_commits_branch_id ON public.commits USING btree (branch_id);


--
-- TOC entry 3389 (class 1259 OID 17323)
-- Name: idx_commits_commit_date; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_commits_commit_date ON public.commits USING btree (commit_date);


--
-- TOC entry 3390 (class 1259 OID 17321)
-- Name: idx_commits_repository_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_commits_repository_id ON public.commits USING btree (repository_id);


--
-- TOC entry 3391 (class 1259 OID 17324)
-- Name: idx_commits_task_references; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_commits_task_references ON public.commits USING gin (task_references);


--
-- TOC entry 3373 (class 1259 OID 17318)
-- Name: idx_repositories_assignment_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_repositories_assignment_id ON public.repositories USING btree (assignment_id);


--
-- TOC entry 3374 (class 1259 OID 17319)
-- Name: idx_repositories_created_by; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_repositories_created_by ON public.repositories USING btree (created_by);


--
-- TOC entry 3398 (class 1259 OID 17382)
-- Name: idx_task_attachments_description_gin; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_task_attachments_description_gin ON public.task_attachments USING gin (to_tsvector('russian'::regconfig, description));


--
-- TOC entry 3399 (class 1259 OID 17366)
-- Name: idx_task_attachments_filename; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_task_attachments_filename ON public.task_attachments USING btree (filename);


--
-- TOC entry 3400 (class 1259 OID 17363)
-- Name: idx_task_attachments_task_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments USING btree (task_id);


--
-- TOC entry 3401 (class 1259 OID 17365)
-- Name: idx_task_attachments_upload_date; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_task_attachments_upload_date ON public.task_attachments USING btree (upload_date DESC);


--
-- TOC entry 3402 (class 1259 OID 17364)
-- Name: idx_task_attachments_user_id; Type: INDEX; Schema: public; Owner: democran
--

CREATE INDEX idx_task_attachments_user_id ON public.task_attachments USING btree (user_id);


--
-- TOC entry 3579 (class 2618 OID 17333)
-- Name: commits_with_tasks _RETURN; Type: RULE; Schema: public; Owner: democran
--

CREATE OR REPLACE VIEW public.commits_with_tasks AS
 SELECT c.id,
    c.repository_id,
    c.branch_id,
    c.hash,
    c.author_name,
    c.author_email,
    c.message,
    c.commit_date,
    c.parent_hashes,
    c.task_references,
    c.created_at,
    c.updated_at,
    r.name AS repository_name,
    r.url AS repository_url,
    b.name AS branch_name,
    array_agg(DISTINCT t.id) FILTER (WHERE (t.id IS NOT NULL)) AS linked_task_ids,
    array_agg(DISTINCT t.title) FILTER (WHERE (t.title IS NOT NULL)) AS linked_task_titles
   FROM ((((public.commits c
     LEFT JOIN public.repositories r ON ((c.repository_id = r.id)))
     LEFT JOIN public.branches b ON ((c.branch_id = b.id)))
     LEFT JOIN public.commit_task_links ctl ON ((c.id = ctl.commit_id)))
     LEFT JOIN public.tasks t ON ((ctl.task_id = t.id)))
  GROUP BY c.id, r.name, r.url, b.name;


--
-- TOC entry 3437 (class 2620 OID 17031)
-- Name: assignment_members assignment_members_audit_trigger; Type: TRIGGER; Schema: public; Owner: democran
--

CREATE TRIGGER assignment_members_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.assignment_members FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- TOC entry 3435 (class 2620 OID 17028)
-- Name: assignments assignments_audit_trigger; Type: TRIGGER; Schema: public; Owner: democran
--

CREATE TRIGGER assignments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- TOC entry 3439 (class 2620 OID 17368)
-- Name: task_attachments task_attachments_audit_trigger; Type: TRIGGER; Schema: public; Owner: democran
--

CREATE TRIGGER task_attachments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.task_attachments FOR EACH ROW EXECUTE FUNCTION public.task_attachments_audit_trigger_function();


--
-- TOC entry 3436 (class 2620 OID 17030)
-- Name: task_comments task_comments_audit_trigger; Type: TRIGGER; Schema: public; Owner: democran
--

CREATE TRIGGER task_comments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- TOC entry 3438 (class 2620 OID 17329)
-- Name: commits trigger_commit_task_references; Type: TRIGGER; Schema: public; Owner: democran
--

CREATE TRIGGER trigger_commit_task_references AFTER INSERT ON public.commits FOR EACH ROW EXECUTE FUNCTION public.trigger_parse_commit_task_references();


--
-- TOC entry 3434 (class 2620 OID 17027)
-- Name: users users_audit_trigger; Type: TRIGGER; Schema: public; Owner: democran
--

CREATE TRIGGER users_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- TOC entry 3416 (class 2606 OID 16731)
-- Name: archived_tasks archived_tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- TOC entry 3417 (class 2606 OID 16721)
-- Name: archived_tasks archived_tasks_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- TOC entry 3418 (class 2606 OID 16726)
-- Name: archived_tasks archived_tasks_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- TOC entry 3419 (class 2606 OID 16741)
-- Name: archived_tasks archived_tasks_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.task_priorities(id);


--
-- TOC entry 3420 (class 2606 OID 16736)
-- Name: archived_tasks archived_tasks_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.task_statuses(id);


--
-- TOC entry 3421 (class 2606 OID 16758)
-- Name: assignment_members assignment_members_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- TOC entry 3422 (class 2606 OID 16768)
-- Name: assignment_members assignment_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- TOC entry 3423 (class 2606 OID 16763)
-- Name: assignment_members assignment_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3408 (class 2606 OID 16580)
-- Name: assignments assignments_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- TOC entry 3424 (class 2606 OID 17015)
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3427 (class 2606 OID 17269)
-- Name: branches branches_repository_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id) ON DELETE CASCADE;


--
-- TOC entry 3430 (class 2606 OID 17308)
-- Name: commit_task_links commit_task_links_commit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_commit_id_fkey FOREIGN KEY (commit_id) REFERENCES public.commits(id) ON DELETE CASCADE;


--
-- TOC entry 3431 (class 2606 OID 17313)
-- Name: commit_task_links commit_task_links_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3428 (class 2606 OID 17292)
-- Name: commits commits_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- TOC entry 3429 (class 2606 OID 17287)
-- Name: commits commits_repository_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id) ON DELETE CASCADE;


--
-- TOC entry 3425 (class 2606 OID 17247)
-- Name: repositories repositories_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- TOC entry 3426 (class 2606 OID 17252)
-- Name: repositories repositories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3432 (class 2606 OID 17353)
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3433 (class 2606 OID 17358)
-- Name: task_attachments task_attachments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3414 (class 2606 OID 16617)
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3415 (class 2606 OID 16622)
-- Name: task_comments task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3411 (class 2606 OID 16558)
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- TOC entry 3409 (class 2606 OID 16548)
-- Name: tasks tasks_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- TOC entry 3410 (class 2606 OID 16553)
-- Name: tasks tasks_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- TOC entry 3413 (class 2606 OID 16568)
-- Name: tasks tasks_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.task_priorities(id);


--
-- TOC entry 3412 (class 2606 OID 16563)
-- Name: tasks tasks_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.task_statuses(id);


--
-- TOC entry 3407 (class 2606 OID 16503)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: democran
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


-- Completed on 2025-12-16 00:17:58 UTC

--
-- PostgreSQL database dump complete
--
