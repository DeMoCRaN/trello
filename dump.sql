PGDMP     ;                    ~            democran    14.20 (Debian 14.20-1.pgdg13+1)    14.20 Н    i           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            j           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            k           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            l           1262    16384    democran    DATABASE     \   CREATE DATABASE democran WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_US.utf8';
    DROP DATABASE democran;
                democran    false                        2615    17121    public    SCHEMA        CREATE SCHEMA public;
    DROP SCHEMA public;
                democran    false            m           0    0 
   SCHEMA public    COMMENT     6   COMMENT ON SCHEMA public IS 'standard public schema';
                   democran    false    5            т            1255    17492    audit_trigger_function()    FUNCTION     W  CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- РџСЂРѕСЃС‚Р°СЏ РІРµСЂСЃРёСЏ Р±РµР· РѕС€РёР±РѕРє
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
 /   DROP FUNCTION public.audit_trigger_function();
       public          democran    false    5            ю            1255    17123 -   get_audit_history(character varying, integer)    FUNCTION     Ђ  CREATE FUNCTION public.get_audit_history(p_table_name character varying, p_record_id integer) RETURNS TABLE(operation character varying, old_data jsonb, new_data jsonb, changed_columns text[], user_id integer, username character varying, created_at timestamp without time zone)
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
 ]   DROP FUNCTION public.get_audit_history(p_table_name character varying, p_record_id integer);
       public          democran    false    5            я            1255    17124    get_commits_by_task(integer)    FUNCTION     ¤  CREATE FUNCTION public.get_commits_by_task(task_id_param integer) RETURNS TABLE(id integer, hash character varying, message text, author_name character varying, author_email character varying, commit_date timestamp without time zone, repository_name character varying, branch_name character varying)
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
 A   DROP FUNCTION public.get_commits_by_task(task_id_param integer);
       public          democran    false    5                        1255    17125 8   get_task_attachments(integer, integer, integer, boolean)    FUNCTION       CREATE FUNCTION public.get_task_attachments(p_task_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_include_deleted boolean DEFAULT false) RETURNS TABLE(attachment_id integer, filename character varying, original_filename character varying, file_size bigint, mime_type character varying, description text, upload_date timestamp without time zone, uploader_id integer, uploader_username character varying, is_deleted boolean)
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
 |   DROP FUNCTION public.get_task_attachments(p_task_id integer, p_limit integer, p_offset integer, p_include_deleted boolean);
       public          democran    false    5                       1255    17126 #   get_task_attachments_stats(integer)    FUNCTION     Р  CREATE FUNCTION public.get_task_attachments_stats(p_task_id integer) RETURNS TABLE(total_count bigint, total_size bigint, file_types jsonb)
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
 D   DROP FUNCTION public.get_task_attachments_stats(p_task_id integer);
       public          democran    false    5                       1255    17127 $   get_user_audit_log(integer, integer)    FUNCTION     -  CREATE FUNCTION public.get_user_audit_log(p_user_id integer, p_days integer DEFAULT 30) RETURNS TABLE(table_name character varying, record_id integer, operation character varying, changed_columns text[], created_at timestamp without time zone)
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
 L   DROP FUNCTION public.get_user_audit_log(p_user_id integer, p_days integer);
       public          democran    false    5                       1255    17128    parse_task_references(text)    FUNCTION       CREATE FUNCTION public.parse_task_references(commit_message text) RETURNS integer[]
    LANGUAGE plpgsql
    AS $$
DECLARE
  task_ids INTEGER[] := ARRAY[]::INTEGER[];
  matches TEXT[];
  match TEXT;
  task_id INTEGER;
BEGIN
  -- РС‰РµРј РїР°С‚С‚РµСЂРЅС‹ РІРёРґР° #123 РёР»Рё Task: 123 РёР»Рё task 123
  SELECT array_agg(regexp_matches[1]) INTO matches
  FROM regexp_matches(commit_message, '(?:#|Task:\s*|task\s+)(\d+)', 'gi');

  IF matches IS NOT NULL THEN
    FOREACH match IN ARRAY matches LOOP
      BEGIN
        task_id := match::INTEGER;
        task_ids := array_append(task_ids, task_id);
      EXCEPTION WHEN OTHERS THEN
        -- РџСЂРѕРїСѓСЃРєР°РµРј РЅРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ ID
        CONTINUE;
      END;
    END LOOP;
  END IF;

  RETURN task_ids;
END;
$$;
 A   DROP FUNCTION public.parse_task_references(commit_message text);
       public          democran    false    5                       1255    17129    set_current_user(integer)    FUNCTION     ·   CREATE FUNCTION public.set_current_user(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, FALSE);
END;
$$;
 8   DROP FUNCTION public.set_current_user(user_id integer);
       public          democran    false    5                       1255    17130 -   soft_delete_task_attachment(integer, integer)    FUNCTION       CREATE FUNCTION public.soft_delete_task_attachment(p_attachment_id integer, p_user_id integer) RETURNS boolean
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
 ^   DROP FUNCTION public.soft_delete_task_attachment(p_attachment_id integer, p_user_id integer);
       public          democran    false    5                       1255    17131 )   task_attachments_audit_trigger_function()    FUNCTION     ц  CREATE FUNCTION public.task_attachments_audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Р’СЃС‚Р°РІР»СЏРµРј Р·Р°РїРёСЃСЊ РІ Р°СѓРґРёС‚ Р»РѕРі
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
        ARRAY[]::TEXT[], -- РњРѕР¶РЅРѕ СЂР°СЃС€РёСЂРёС‚СЊ РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РёР·РјРµРЅРµРЅРЅС‹С… РєРѕР»РѕРЅРѕРє
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
 @   DROP FUNCTION public.task_attachments_audit_trigger_function();
       public          democran    false    5                       1255    17132 &   trigger_parse_commit_task_references()    FUNCTION     }  CREATE FUNCTION public.trigger_parse_commit_task_references() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- РџР°СЂСЃРёРј СЃСЃС‹Р»РєРё РЅР° Р·Р°РґР°С‡Рё РёР· СЃРѕРѕР±С‰РµРЅРёСЏ РєРѕРјРјРёС‚Р°
  NEW.task_references := parse_task_references(NEW.message);

  -- РЎРѕР·РґР°РµРј СЃРІСЏР·Рё РєРѕРјРјРёС‚-Р·Р°РґР°С‡Р°
  IF NEW.task_references IS NOT NULL AND array_length(NEW.task_references, 1) > 0 THEN
    INSERT INTO commit_task_links (commit_id, task_id, reference_type)
    SELECT NEW.id, unnest(NEW.task_references), 'message'
    ON CONFLICT (commit_id, task_id, reference_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
 =   DROP FUNCTION public.trigger_parse_commit_task_references();
       public          democran    false    5            Ф            1259    17173    archived_tasks    TABLE     Я  CREATE TABLE public.archived_tasks (
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
    deleted_at timestamp without time zone DEFAULT now(),
    failed_reason text,
    failed_at timestamp without time zone
);
 "   DROP TABLE public.archived_tasks;
       public         heap    democran    false    5            Х            1259    17183    archived_tasks_id_seq    SEQUENCE     Ќ   CREATE SEQUENCE public.archived_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 ,   DROP SEQUENCE public.archived_tasks_id_seq;
       public          democran    false    5    212            n           0    0    archived_tasks_id_seq    SEQUENCE OWNED BY     O   ALTER SEQUENCE public.archived_tasks_id_seq OWNED BY public.archived_tasks.id;
          public          democran    false    213            Ц            1259    17184    assignment_members    TABLE     *  CREATE TABLE public.assignment_members (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    user_id integer NOT NULL,
    invited_by integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    invited_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    CONSTRAINT assignment_members_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('rejected'::character varying)::text])))
);
 &   DROP TABLE public.assignment_members;
       public         heap    democran    false    5            Ч            1259    17190    assignment_members_id_seq    SEQUENCE     ‘   CREATE SEQUENCE public.assignment_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 0   DROP SEQUENCE public.assignment_members_id_seq;
       public          democran    false    5    214            o           0    0    assignment_members_id_seq    SEQUENCE OWNED BY     W   ALTER SEQUENCE public.assignment_members_id_seq OWNED BY public.assignment_members.id;
          public          democran    false    215            С            1259    17133    assignments    TABLE     b  CREATE TABLE public.assignments (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    creator_id integer DEFAULT 1 NOT NULL,
    color character varying(7) DEFAULT '#1976d2'::character varying
);
    DROP TABLE public.assignments;
       public         heap    democran    false    5            Ш            1259    17191    assignments_id_seq    SEQUENCE     Љ   CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.assignments_id_seq;
       public          democran    false    209    5            p           0    0    assignments_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;
          public          democran    false    216            Щ            1259    17192 	   audit_log    TABLE     9  CREATE TABLE public.audit_log (
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
    CONSTRAINT audit_log_operation_check CHECK (((operation)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);
    DROP TABLE public.audit_log;
       public         heap    democran    false    5            Ъ            1259    17199    audit_log_id_seq    SEQUENCE     €   CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.audit_log_id_seq;
       public          democran    false    217    5            q           0    0    audit_log_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;
          public          democran    false    218            Ы            1259    17200    branches    TABLE     Ђ  CREATE TABLE public.branches (
    id integer NOT NULL,
    repository_id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_default boolean DEFAULT false,
    last_commit_hash character varying(40),
    last_commit_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.branches;
       public         heap    democran    false    5            Ь            1259    17206    branches_id_seq    SEQUENCE     ‡   CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.branches_id_seq;
       public          democran    false    5    219            r           0    0    branches_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;
          public          democran    false    220            Э            1259    17207    commit_task_links    TABLE     
  CREATE TABLE public.commit_task_links (
    id integer NOT NULL,
    commit_id integer NOT NULL,
    task_id integer NOT NULL,
    reference_type character varying(50) DEFAULT 'message'::character varying,
    created_at timestamp without time zone DEFAULT now()
);
 %   DROP TABLE public.commit_task_links;
       public         heap    democran    false    5            Ю            1259    17212    commit_task_links_id_seq    SEQUENCE     ђ   CREATE SEQUENCE public.commit_task_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 /   DROP SEQUENCE public.commit_task_links_id_seq;
       public          democran    false    221    5            s           0    0    commit_task_links_id_seq    SEQUENCE OWNED BY     U   ALTER SEQUENCE public.commit_task_links_id_seq OWNED BY public.commit_task_links.id;
          public          democran    false    222            Я            1259    17213    commits    TABLE     м  CREATE TABLE public.commits (
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
    DROP TABLE public.commits;
       public         heap    democran    false    5            а            1259    17220    commits_id_seq    SEQUENCE     †   CREATE SEQUENCE public.commits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 %   DROP SEQUENCE public.commits_id_seq;
       public          democran    false    5    223            t           0    0    commits_id_seq    SEQUENCE OWNED BY     A   ALTER SEQUENCE public.commits_id_seq OWNED BY public.commits.id;
          public          democran    false    224            б            1259    17221    commits_with_tasks    VIEW       CREATE VIEW public.commits_with_tasks AS
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
 %   DROP VIEW public.commits_with_tasks;
       public          democran    false    5            п            1259    17495    deleted_failed_tasks    TABLE     р  CREATE TABLE public.deleted_failed_tasks (
    id integer NOT NULL,
    original_task_id integer,
    assignment_id integer,
    title character varying(255) NOT NULL,
    description text,
    deadline timestamp without time zone,
    creator_id integer NOT NULL,
    assignee_id integer,
    status_id integer NOT NULL,
    priority_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    seen_at timestamp without time zone,
    in_progress_since timestamp without time zone,
    work_duration integer DEFAULT 0,
    progress_percentage double precision DEFAULT 0,
    failed_reason text,
    failed_at timestamp without time zone,
    deleted_at timestamp without time zone DEFAULT now()
);
 (   DROP TABLE public.deleted_failed_tasks;
       public         heap    democran    false    5            о            1259    17494    deleted_failed_tasks_id_seq    SEQUENCE     “   CREATE SEQUENCE public.deleted_failed_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 2   DROP SEQUENCE public.deleted_failed_tasks_id_seq;
       public          democran    false    5    239            u           0    0    deleted_failed_tasks_id_seq    SEQUENCE OWNED BY     [   ALTER SEQUENCE public.deleted_failed_tasks_id_seq OWNED BY public.deleted_failed_tasks.id;
          public          democran    false    238            в            1259    17225    repositories    TABLE     {  CREATE TABLE public.repositories (
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
     DROP TABLE public.repositories;
       public         heap    democran    false    5            г            1259    17233    repositories_id_seq    SEQUENCE     ‹   CREATE SEQUENCE public.repositories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.repositories_id_seq;
       public          democran    false    226    5            v           0    0    repositories_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public.repositories_id_seq OWNED BY public.repositories.id;
          public          democran    false    227            д            1259    17234    roles    TABLE     `   CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);
    DROP TABLE public.roles;
       public         heap    democran    false    5            е            1259    17237    roles_id_seq    SEQUENCE     „   CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.roles_id_seq;
       public          democran    false    228    5            w           0    0    roles_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;
          public          democran    false    229            ж            1259    17239 
   task_comments    TABLE     р   CREATE TABLE public.task_comments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    text text NOT NULL,
    is_read boolean DEFAULT false
);
 !   DROP TABLE public.task_comments;
       public         heap    democran    false    5            з            1259    17246    task_comments_id_seq    SEQUENCE     Њ   CREATE SEQUENCE public.task_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.task_comments_id_seq;
       public          democran    false    230    5            x           0    0    task_comments_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;
          public          democran    false    231            и            1259    17247    task_priorities    TABLE     j   CREATE TABLE public.task_priorities (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);
 #   DROP TABLE public.task_priorities;
       public         heap    democran    false    5            й            1259    17250    task_priorities_id_seq    SEQUENCE     Ћ   CREATE SEQUENCE public.task_priorities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.task_priorities_id_seq;
       public          democran    false    5    232            y           0    0    task_priorities_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.task_priorities_id_seq OWNED BY public.task_priorities.id;
          public          democran    false    233            к            1259    17251 
   task_statuses    TABLE     h   CREATE TABLE public.task_statuses (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);
 !   DROP TABLE public.task_statuses;
       public         heap    democran    false    5            л            1259    17254    task_statuses_id_seq    SEQUENCE     Њ   CREATE SEQUENCE public.task_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.task_statuses_id_seq;
       public          democran    false    234    5            z           0    0    task_statuses_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.task_statuses_id_seq OWNED BY public.task_statuses.id;
          public          democran    false    235            Т            1259    17151    tasks    TABLE     ў  CREATE TABLE public.tasks (
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
    progress_percentage double precision DEFAULT 0,
    failed_reason text,
    failed_at timestamp without time zone
);
    DROP TABLE public.tasks;
       public         heap    democran    false    5            м            1259    17255    tasks_id_seq    SEQUENCE     „   CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.tasks_id_seq;
       public          democran    false    5    210            {           0    0    tasks_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;
          public          democran    false    236            с            1259    17510    user_notifications    TABLE     ‘  CREATE TABLE public.user_notifications (
    id integer NOT NULL,
    recipient_id integer NOT NULL,
    actor_id integer,
    assignment_id integer,
    invitation_id integer,
    type character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
 &   DROP TABLE public.user_notifications;
       public         heap    democran    false    5            р            1259    17509    user_notifications_id_seq    SEQUENCE     ‘   CREATE SEQUENCE public.user_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 0   DROP SEQUENCE public.user_notifications_id_seq;
       public          democran    false    241    5            |           0    0    user_notifications_id_seq    SEQUENCE OWNED BY     W   ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;
          public          democran    false    240            У            1259    17160    users    TABLE     д  CREATE TABLE public.users (
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
    DROP TABLE public.users;
       public         heap    democran    false    5            н            1259    17256    users_id_seq    SEQUENCE     „   CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public          democran    false    211    5            }           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public          democran    false    237            #
           2604    17257    archived_tasks id    DEFAULT     v   ALTER TABLE ONLY public.archived_tasks ALTER COLUMN id SET DEFAULT nextval('public.archived_tasks_id_seq'::regclass);
 @   ALTER TABLE public.archived_tasks ALTER COLUMN id DROP DEFAULT;
       public          democran    false    213    212            &
           2604    17258    assignment_members id    DEFAULT     ~   ALTER TABLE ONLY public.assignment_members ALTER COLUMN id SET DEFAULT nextval('public.assignment_members_id_seq'::regclass);
 D   ALTER TABLE public.assignment_members ALTER COLUMN id DROP DEFAULT;
       public          democran    false    215    214            
           2604    17259    assignments id    DEFAULT     p   ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);
 =   ALTER TABLE public.assignments ALTER COLUMN id DROP DEFAULT;
       public          democran    false    216    209            )
           2604    17260    audit_log id    DEFAULT     l   ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);
 ;   ALTER TABLE public.audit_log ALTER COLUMN id DROP DEFAULT;
       public          democran    false    218    217            .
           2604    17261    branches id    DEFAULT     j   ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);
 :   ALTER TABLE public.branches ALTER COLUMN id DROP DEFAULT;
       public          democran    false    220    219            1
           2604    17262    commit_task_links id    DEFAULT     |   ALTER TABLE ONLY public.commit_task_links ALTER COLUMN id SET DEFAULT nextval('public.commit_task_links_id_seq'::regclass);
 C   ALTER TABLE public.commit_task_links ALTER COLUMN id DROP DEFAULT;
       public          democran    false    222    221            4
           2604    17263 
   commits id    DEFAULT     h   ALTER TABLE ONLY public.commits ALTER COLUMN id SET DEFAULT nextval('public.commits_id_seq'::regclass);
 9   ALTER TABLE public.commits ALTER COLUMN id DROP DEFAULT;
       public          democran    false    224    223            ?
           2604    17498    deleted_failed_tasks id    DEFAULT     ‚   ALTER TABLE ONLY public.deleted_failed_tasks ALTER COLUMN id SET DEFAULT nextval('public.deleted_failed_tasks_id_seq'::regclass);
 F   ALTER TABLE public.deleted_failed_tasks ALTER COLUMN id DROP DEFAULT;
       public          democran    false    238    239    239            8
           2604    17264    repositories id    DEFAULT     r   ALTER TABLE ONLY public.repositories ALTER COLUMN id SET DEFAULT nextval('public.repositories_id_seq'::regclass);
 >   ALTER TABLE public.repositories ALTER COLUMN id DROP DEFAULT;
       public          democran    false    227    226            9
           2604    17265    roles id    DEFAULT     d   ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);
 7   ALTER TABLE public.roles ALTER COLUMN id DROP DEFAULT;
       public          democran    false    229    228            :
           2604    17267    task_comments id    DEFAULT     t   ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);
 ?   ALTER TABLE public.task_comments ALTER COLUMN id DROP DEFAULT;
       public          democran    false    231    230            =
           2604    17268    task_priorities id    DEFAULT     x   ALTER TABLE ONLY public.task_priorities ALTER COLUMN id SET DEFAULT nextval('public.task_priorities_id_seq'::regclass);
 A   ALTER TABLE public.task_priorities ALTER COLUMN id DROP DEFAULT;
       public          democran    false    233    232            >
           2604    17269    task_statuses id    DEFAULT     t   ALTER TABLE ONLY public.task_statuses ALTER COLUMN id SET DEFAULT nextval('public.task_statuses_id_seq'::regclass);
 ?   ALTER TABLE public.task_statuses ALTER COLUMN id DROP DEFAULT;
       public          democran    false    235    234            
           2604    17270    tasks id    DEFAULT     d   ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);
 7   ALTER TABLE public.tasks ALTER COLUMN id DROP DEFAULT;
       public          democran    false    236    210            C
           2604    17513    user_notifications id    DEFAULT     ~   ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);
 D   ALTER TABLE public.user_notifications ALTER COLUMN id DROP DEFAULT;
       public          democran    false    241    240    241            
           2604    17271    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public          democran    false    237    211            J          0    17173    archived_tasks 
   TABLE DATA             COPY public.archived_tasks (id, assignment_id, title, description, deadline, creator_id, assignee_id, status_id, priority_id, created_at, updated_at, seen_at, in_progress_since, work_duration, progress_percentage, deleted_at, failed_reason, failed_at) FROM stdin;
    public          democran    false    212   Р3      L          0    17184    assignment_members 
   TABLE DATA           v   COPY public.assignment_members (id, assignment_id, user_id, invited_by, status, invited_at, responded_at) FROM stdin;
    public          democran    false    214   N4      G          0    17133    assignments 
   TABLE DATA           h   COPY public.assignments (id, title, description, created_at, updated_at, creator_id, color) FROM stdin;
    public          democran    false    209   Ш4      O          0    17192 	   audit_log 
   TABLE DATA           ›   COPY public.audit_log (id, table_name, record_id, operation, old_data, new_data, changed_columns, user_id, ip_address, user_agent, created_at) FROM stdin;
    public          democran    false    217   C5      Q          0    17200    branches 
   TABLE DATA           ѓ   COPY public.branches (id, repository_id, name, is_default, last_commit_hash, last_commit_date, created_at, updated_at) FROM stdin;
    public          democran    false    219   Y=      S          0    17207    commit_task_links 
   TABLE DATA           _   COPY public.commit_task_links (id, commit_id, task_id, reference_type, created_at) FROM stdin;
    public          democran    false    221   v=      U          0    17213    commits 
   TABLE DATA           ®   COPY public.commits (id, repository_id, branch_id, hash, author_name, author_email, message, commit_date, parent_hashes, task_references, created_at, updated_at) FROM stdin;
    public          democran    false    223   “=      d          0    17495    deleted_failed_tasks 
   TABLE DATA              COPY public.deleted_failed_tasks (id, original_task_id, assignment_id, title, description, deadline, creator_id, assignee_id, status_id, priority_id, created_at, updated_at, seen_at, in_progress_since, work_duration, progress_percentage, failed_reason, failed_at, deleted_at) FROM stdin;
    public          democran    false    239   °=      W          0    17225    repositories 
   TABLE DATA           Ђ   COPY public.repositories (id, name, url, description, assignment_id, created_by, created_at, updated_at, is_active) FROM stdin;
    public          democran    false    226   т>      Y          0    17234    roles 
   TABLE DATA           )   COPY public.roles (id, name) FROM stdin;
    public          democran    false    228   ?      [          0    17239 
   task_comments 
   TABLE DATA           X   COPY public.task_comments (id, task_id, user_id, created_at, text, is_read) FROM stdin;
    public          democran    false    230   C?      ]          0    17247    task_priorities 
   TABLE DATA           3   COPY public.task_priorities (id, name) FROM stdin;
    public          democran    false    232   €?      _          0    17251 
   task_statuses 
   TABLE DATA           1   COPY public.task_statuses (id, name) FROM stdin;
    public          democran    false    234   Ж?      H          0    17151    tasks 
   TABLE DATA           у   COPY public.tasks (id, assignment_id, title, description, deadline, creator_id, assignee_id, status_id, priority_id, created_at, updated_at, seen_at, in_progress_since, work_duration, progress_percentage, failed_reason, failed_at) FROM stdin;
    public          democran    false    210   @      f          0    17510    user_notifications 
   TABLE DATA           ‘   COPY public.user_notifications (id, recipient_id, actor_id, assignment_id, invitation_id, type, title, message, is_read, created_at) FROM stdin;
    public          democran    false    241   м@      I          0    17160    users 
   TABLE DATA           Ў   COPY public.users (id, username, email, password, role_id, created_at, updated_at, github_id, github_username, github_token, github_connected, name) FROM stdin;
    public          democran    false    211   	A      ~           0    0    archived_tasks_id_seq    SEQUENCE SET     D   SELECT pg_catalog.setval('public.archived_tasks_id_seq', 1, false);
          public          democran    false    213                       0    0    assignment_members_id_seq    SEQUENCE SET     H   SELECT pg_catalog.setval('public.assignment_members_id_seq', 21, true);
          public          democran    false    215            Ђ           0    0    assignments_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.assignments_id_seq', 60, true);
          public          democran    false    216            Ѓ           0    0    audit_log_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.audit_log_id_seq', 54, true);
          public          democran    false    218            ‚           0    0    branches_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public.branches_id_seq', 1, false);
          public          democran    false    220            ѓ           0    0    commit_task_links_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public.commit_task_links_id_seq', 1, false);
          public          democran    false    222            „           0    0    commits_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.commits_id_seq', 1, false);
          public          democran    false    224            …           0    0    deleted_failed_tasks_id_seq    SEQUENCE SET     I   SELECT pg_catalog.setval('public.deleted_failed_tasks_id_seq', 3, true);
          public          democran    false    238            †           0    0    repositories_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.repositories_id_seq', 1, false);
          public          democran    false    227            ‡           0    0    roles_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('public.roles_id_seq', 3, true);
          public          democran    false    229            €           0    0    task_comments_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.task_comments_id_seq', 82, true);
          public          democran    false    231            ‰           0    0    task_priorities_id_seq    SEQUENCE SET     D   SELECT pg_catalog.setval('public.task_priorities_id_seq', 3, true);
          public          democran    false    233            Љ           0    0    task_statuses_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.task_statuses_id_seq', 3, true);
          public          democran    false    235            ‹           0    0    tasks_id_seq    SEQUENCE SET     <   SELECT pg_catalog.setval('public.tasks_id_seq', 204, true);
          public          democran    false    236            Њ           0    0    user_notifications_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public.user_notifications_id_seq', 2, true);
          public          democran    false    240            Ќ           0    0    users_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('public.users_id_seq', 1, true);
          public          democran    false    237            S
           2606    17273 "   archived_tasks archived_tasks_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_pkey PRIMARY KEY (id);
 L   ALTER TABLE ONLY public.archived_tasks DROP CONSTRAINT archived_tasks_pkey;
       public            democran    false    212            U
           2606    17275 ?   assignment_members assignment_members_assignment_id_user_id_key 
   CONSTRAINT     Њ   ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_assignment_id_user_id_key UNIQUE (assignment_id, user_id);
 i   ALTER TABLE ONLY public.assignment_members DROP CONSTRAINT assignment_members_assignment_id_user_id_key;
       public            democran    false    214    214            W
           2606    17277 *   assignment_members assignment_members_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public.assignment_members DROP CONSTRAINT assignment_members_pkey;
       public            democran    false    214            G
           2606    17279    assignments assignments_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.assignments DROP CONSTRAINT assignments_pkey;
       public            democran    false    209            \
           2606    17281    audit_log audit_log_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.audit_log DROP CONSTRAINT audit_log_pkey;
       public            democran    false    217            c
           2606    17283    branches branches_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.branches DROP CONSTRAINT branches_pkey;
       public            democran    false    219            e
           2606    17285 (   branches branches_repository_id_name_key 
   CONSTRAINT     r   ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_repository_id_name_key UNIQUE (repository_id, name);
 R   ALTER TABLE ONLY public.branches DROP CONSTRAINT branches_repository_id_name_key;
       public            democran    false    219    219            h
           2606    17287 H   commit_task_links commit_task_links_commit_id_task_id_reference_type_key 
   CONSTRAINT     Ў   ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_commit_id_task_id_reference_type_key UNIQUE (commit_id, task_id, reference_type);
 r   ALTER TABLE ONLY public.commit_task_links DROP CONSTRAINT commit_task_links_commit_id_task_id_reference_type_key;
       public            democran    false    221    221    221            j
           2606    17289 (   commit_task_links commit_task_links_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_pkey PRIMARY KEY (id);
 R   ALTER TABLE ONLY public.commit_task_links DROP CONSTRAINT commit_task_links_pkey;
       public            democran    false    221            n
           2606    17291    commits commits_hash_key 
   CONSTRAINT     S   ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_hash_key UNIQUE (hash);
 B   ALTER TABLE ONLY public.commits DROP CONSTRAINT commits_hash_key;
       public            democran    false    223            p
           2606    17293    commits commits_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_pkey PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.commits DROP CONSTRAINT commits_pkey;
       public            democran    false    223            Љ
           2606    17505 .   deleted_failed_tasks deleted_failed_tasks_pkey 
   CONSTRAINT     l   ALTER TABLE ONLY public.deleted_failed_tasks
    ADD CONSTRAINT deleted_failed_tasks_pkey PRIMARY KEY (id);
 X   ALTER TABLE ONLY public.deleted_failed_tasks DROP CONSTRAINT deleted_failed_tasks_pkey;
       public            democran    false    239            x
           2606    17295    repositories repositories_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);
 H   ALTER TABLE ONLY public.repositories DROP CONSTRAINT repositories_pkey;
       public            democran    false    226            z
           2606    17297 !   repositories repositories_url_key 
   CONSTRAINT     [   ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_url_key UNIQUE (url);
 K   ALTER TABLE ONLY public.repositories DROP CONSTRAINT repositories_url_key;
       public            democran    false    226            |
           2606    17299    roles roles_name_key 
   CONSTRAINT     O   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);
 >   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_name_key;
       public            democran    false    228            ~
           2606    17301    roles roles_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_pkey;
       public            democran    false    228            Ђ
           2606    17305     task_comments task_comments_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.task_comments DROP CONSTRAINT task_comments_pkey;
       public            democran    false    230            ‚
           2606    17307 (   task_priorities task_priorities_name_key 
   CONSTRAINT     c   ALTER TABLE ONLY public.task_priorities
    ADD CONSTRAINT task_priorities_name_key UNIQUE (name);
 R   ALTER TABLE ONLY public.task_priorities DROP CONSTRAINT task_priorities_name_key;
       public            democran    false    232            „
           2606    17309 $   task_priorities task_priorities_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.task_priorities
    ADD CONSTRAINT task_priorities_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.task_priorities DROP CONSTRAINT task_priorities_pkey;
       public            democran    false    232            †
           2606    17311 $   task_statuses task_statuses_name_key 
   CONSTRAINT     _   ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT task_statuses_name_key UNIQUE (name);
 N   ALTER TABLE ONLY public.task_statuses DROP CONSTRAINT task_statuses_name_key;
       public            democran    false    234            €
           2606    17313     task_statuses task_statuses_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT task_statuses_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.task_statuses DROP CONSTRAINT task_statuses_pkey;
       public            democran    false    234            I
           2606    17315    tasks tasks_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_pkey;
       public            democran    false    210            ‘
           2606    17519 *   user_notifications user_notifications_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public.user_notifications DROP CONSTRAINT user_notifications_pkey;
       public            democran    false    241            K
           2606    17320    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public            democran    false    211            M
           2606    17322    users users_github_id_key 
   CONSTRAINT     Y   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_github_id_key UNIQUE (github_id);
 C   ALTER TABLE ONLY public.users DROP CONSTRAINT users_github_id_key;
       public            democran    false    211            O
           2606    17324    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public            democran    false    211            Q
           2606    17326    users users_username_key 
   CONSTRAINT     W   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);
 B   ALTER TABLE ONLY public.users DROP CONSTRAINT users_username_key;
       public            democran    false    211            X
           1259    17327 $   idx_assignment_members_assignment_id    INDEX     l   CREATE INDEX idx_assignment_members_assignment_id ON public.assignment_members USING btree (assignment_id);
 8   DROP INDEX public.idx_assignment_members_assignment_id;
       public            democran    false    214            Y
           1259    17328    idx_assignment_members_status    INDEX     ^   CREATE INDEX idx_assignment_members_status ON public.assignment_members USING btree (status);
 1   DROP INDEX public.idx_assignment_members_status;
       public            democran    false    214            Z
           1259    17329    idx_assignment_members_user_id    INDEX     `   CREATE INDEX idx_assignment_members_user_id ON public.assignment_members USING btree (user_id);
 2   DROP INDEX public.idx_assignment_members_user_id;
       public            democran    false    214            ]
           1259    17330    idx_audit_log_created_at    INDEX     T   CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);
 ,   DROP INDEX public.idx_audit_log_created_at;
       public            democran    false    217            ^
           1259    17331    idx_audit_log_operation    INDEX     R   CREATE INDEX idx_audit_log_operation ON public.audit_log USING btree (operation);
 +   DROP INDEX public.idx_audit_log_operation;
       public            democran    false    217            _
           1259    17332    idx_audit_log_record_id    INDEX     R   CREATE INDEX idx_audit_log_record_id ON public.audit_log USING btree (record_id);
 +   DROP INDEX public.idx_audit_log_record_id;
       public            democran    false    217            `
           1259    17333    idx_audit_log_table_name    INDEX     T   CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name);
 ,   DROP INDEX public.idx_audit_log_table_name;
       public            democran    false    217            a
           1259    17334    idx_audit_log_user_id    INDEX     N   CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);
 )   DROP INDEX public.idx_audit_log_user_id;
       public            democran    false    217            f
           1259    17335    idx_branches_repository_id    INDEX     X   CREATE INDEX idx_branches_repository_id ON public.branches USING btree (repository_id);
 .   DROP INDEX public.idx_branches_repository_id;
       public            democran    false    219            k
           1259    17336    idx_commit_task_links_commit_id    INDEX     b   CREATE INDEX idx_commit_task_links_commit_id ON public.commit_task_links USING btree (commit_id);
 3   DROP INDEX public.idx_commit_task_links_commit_id;
       public            democran    false    221            l
           1259    17337    idx_commit_task_links_task_id    INDEX     ^   CREATE INDEX idx_commit_task_links_task_id ON public.commit_task_links USING btree (task_id);
 1   DROP INDEX public.idx_commit_task_links_task_id;
       public            democran    false    221            q
           1259    17338    idx_commits_branch_id    INDEX     N   CREATE INDEX idx_commits_branch_id ON public.commits USING btree (branch_id);
 )   DROP INDEX public.idx_commits_branch_id;
       public            democran    false    223            r
           1259    17339    idx_commits_commit_date    INDEX     R   CREATE INDEX idx_commits_commit_date ON public.commits USING btree (commit_date);
 +   DROP INDEX public.idx_commits_commit_date;
       public            democran    false    223            s
           1259    17340    idx_commits_repository_id    INDEX     V   CREATE INDEX idx_commits_repository_id ON public.commits USING btree (repository_id);
 -   DROP INDEX public.idx_commits_repository_id;
       public            democran    false    223            t
           1259    17341    idx_commits_task_references    INDEX     X   CREATE INDEX idx_commits_task_references ON public.commits USING gin (task_references);
 /   DROP INDEX public.idx_commits_task_references;
       public            democran    false    223            ‹
           1259    17506 $   idx_deleted_failed_tasks_assignee_id    INDEX     l   CREATE INDEX idx_deleted_failed_tasks_assignee_id ON public.deleted_failed_tasks USING btree (assignee_id);
 8   DROP INDEX public.idx_deleted_failed_tasks_assignee_id;
       public            democran    false    239            Њ
           1259    17507 #   idx_deleted_failed_tasks_creator_id    INDEX     j   CREATE INDEX idx_deleted_failed_tasks_creator_id ON public.deleted_failed_tasks USING btree (creator_id);
 7   DROP INDEX public.idx_deleted_failed_tasks_creator_id;
       public            democran    false    239            Ќ
           1259    17508 #   idx_deleted_failed_tasks_deleted_at    INDEX     j   CREATE INDEX idx_deleted_failed_tasks_deleted_at ON public.deleted_failed_tasks USING btree (deleted_at);
 7   DROP INDEX public.idx_deleted_failed_tasks_deleted_at;
       public            democran    false    239            u
           1259    17342    idx_repositories_assignment_id    INDEX     `   CREATE INDEX idx_repositories_assignment_id ON public.repositories USING btree (assignment_id);
 2   DROP INDEX public.idx_repositories_assignment_id;
       public            democran    false    226            v
           1259    17343    idx_repositories_created_by    INDEX     Z   CREATE INDEX idx_repositories_created_by ON public.repositories USING btree (created_by);
 /   DROP INDEX public.idx_repositories_created_by;
       public            democran    false    226            Ћ
           1259    17535 #   idx_user_notifications_recipient_id    INDEX     j   CREATE INDEX idx_user_notifications_recipient_id ON public.user_notifications USING btree (recipient_id);
 7   DROP INDEX public.idx_user_notifications_recipient_id;
       public            democran    false    241            Џ
           1259    17536 '   idx_user_notifications_recipient_unread    INDEX     €   CREATE INDEX idx_user_notifications_recipient_unread ON public.user_notifications USING btree (recipient_id, is_read, created_at DESC);
 ;   DROP INDEX public.idx_user_notifications_recipient_unread;
       public            democran    false    241    241    241            F           2618    17224    commits_with_tasks _RETURN    RULE     Y  CREATE OR REPLACE VIEW public.commits_with_tasks AS
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
 !  CREATE OR REPLACE VIEW public.commits_with_tasks AS
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
       public          democran    false    219    223    223    223    223    221    221    223    223    223    226    223    223    223    226    223    226    3440    223    210    210    219    225            ±
           2620    17538 +   archived_tasks archived_tasks_audit_trigger    TRIGGER     Ґ   CREATE TRIGGER archived_tasks_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.archived_tasks FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 D   DROP TRIGGER archived_tasks_audit_trigger ON public.archived_tasks;
       public          democran    false    242    212            І
           2620    17539 3   assignment_members assignment_members_audit_trigger    TRIGGER     ­   CREATE TRIGGER assignment_members_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.assignment_members FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 L   DROP TRIGGER assignment_members_audit_trigger ON public.assignment_members;
       public          democran    false    214    242            ®
           2620    17540 %   assignments assignments_audit_trigger    TRIGGER     џ   CREATE TRIGGER assignments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 >   DROP TRIGGER assignments_audit_trigger ON public.assignments;
       public          democran    false    242    209            і
           2620    17541    branches branches_audit_trigger    TRIGGER     ™   CREATE TRIGGER branches_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 8   DROP TRIGGER branches_audit_trigger ON public.branches;
       public          democran    false    242    219            ґ
           2620    17542 1   commit_task_links commit_task_links_audit_trigger    TRIGGER     «   CREATE TRIGGER commit_task_links_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.commit_task_links FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 J   DROP TRIGGER commit_task_links_audit_trigger ON public.commit_task_links;
       public          democran    false    221    242            µ
           2620    17543    commits commits_audit_trigger    TRIGGER     —   CREATE TRIGGER commits_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.commits FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 6   DROP TRIGGER commits_audit_trigger ON public.commits;
       public          democran    false    223    242            №
           2620    17544 7   deleted_failed_tasks deleted_failed_tasks_audit_trigger    TRIGGER     ±   CREATE TRIGGER deleted_failed_tasks_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.deleted_failed_tasks FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 P   DROP TRIGGER deleted_failed_tasks_audit_trigger ON public.deleted_failed_tasks;
       public          democran    false    239    242            ·
           2620    17545 '   repositories repositories_audit_trigger    TRIGGER     Ў   CREATE TRIGGER repositories_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 @   DROP TRIGGER repositories_audit_trigger ON public.repositories;
       public          democran    false    226    242            ё
           2620    17546 )   task_comments task_comments_audit_trigger    TRIGGER     Ј   CREATE TRIGGER task_comments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 B   DROP TRIGGER task_comments_audit_trigger ON public.task_comments;
       public          democran    false    230    242            Ї
           2620    17537    tasks tasks_audit_trigger    TRIGGER     “   CREATE TRIGGER tasks_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 2   DROP TRIGGER tasks_audit_trigger ON public.tasks;
       public          democran    false    242    210            ¶
           2620    17354 &   commits trigger_commit_task_references    TRIGGER     љ   CREATE TRIGGER trigger_commit_task_references AFTER INSERT ON public.commits FOR EACH ROW EXECUTE FUNCTION public.trigger_parse_commit_task_references();
 ?   DROP TRIGGER trigger_commit_task_references ON public.commits;
       public          democran    false    263    223            є
           2620    17547 3   user_notifications user_notifications_audit_trigger    TRIGGER     ­   CREATE TRIGGER user_notifications_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 L   DROP TRIGGER user_notifications_audit_trigger ON public.user_notifications;
       public          democran    false    242    241            °
           2620    17548    users users_audit_trigger    TRIGGER     “   CREATE TRIGGER users_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
 2   DROP TRIGGER users_audit_trigger ON public.users;
       public          democran    false    242    211            ™
           2606    17356 .   archived_tasks archived_tasks_assignee_id_fkey 
   FK CONSTRAINT     ‘   ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);
 X   ALTER TABLE ONLY public.archived_tasks DROP CONSTRAINT archived_tasks_assignee_id_fkey;
       public          democran    false    211    3407    212            љ
           2606    17361 0   archived_tasks archived_tasks_assignment_id_fkey 
   FK CONSTRAINT     ›   ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);
 Z   ALTER TABLE ONLY public.archived_tasks DROP CONSTRAINT archived_tasks_assignment_id_fkey;
       public          democran    false    209    3399    212            ›
           2606    17366 -   archived_tasks archived_tasks_creator_id_fkey 
   FK CONSTRAINT     Џ   ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);
 W   ALTER TABLE ONLY public.archived_tasks DROP CONSTRAINT archived_tasks_creator_id_fkey;
       public          democran    false    212    3407    211            њ
           2606    17371 .   archived_tasks archived_tasks_priority_id_fkey 
   FK CONSTRAINT     ›   ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.task_priorities(id);
 X   ALTER TABLE ONLY public.archived_tasks DROP CONSTRAINT archived_tasks_priority_id_fkey;
       public          democran    false    3460    232    212            ќ
           2606    17376 ,   archived_tasks archived_tasks_status_id_fkey 
   FK CONSTRAINT     •   ALTER TABLE ONLY public.archived_tasks
    ADD CONSTRAINT archived_tasks_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.task_statuses(id);
 V   ALTER TABLE ONLY public.archived_tasks DROP CONSTRAINT archived_tasks_status_id_fkey;
       public          democran    false    3464    212    234            ћ
           2606    17381 8   assignment_members assignment_members_assignment_id_fkey 
   FK CONSTRAINT     µ   ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;
 b   ALTER TABLE ONLY public.assignment_members DROP CONSTRAINT assignment_members_assignment_id_fkey;
       public          democran    false    3399    214    209            џ
           2606    17386 5   assignment_members assignment_members_invited_by_fkey 
   FK CONSTRAINT     —   ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);
 _   ALTER TABLE ONLY public.assignment_members DROP CONSTRAINT assignment_members_invited_by_fkey;
       public          democran    false    214    3407    211             
           2606    17391 2   assignment_members assignment_members_user_id_fkey 
   FK CONSTRAINT     Ј   ALTER TABLE ONLY public.assignment_members
    ADD CONSTRAINT assignment_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 \   ALTER TABLE ONLY public.assignment_members DROP CONSTRAINT assignment_members_user_id_fkey;
       public          democran    false    214    211    3407            ’
           2606    17396 '   assignments assignments_creator_id_fkey 
   FK CONSTRAINT     ‰   ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);
 Q   ALTER TABLE ONLY public.assignments DROP CONSTRAINT assignments_creator_id_fkey;
       public          democran    false    209    211    3407            Ў
           2606    17401     audit_log audit_log_user_id_fkey 
   FK CONSTRAINT        ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 J   ALTER TABLE ONLY public.audit_log DROP CONSTRAINT audit_log_user_id_fkey;
       public          democran    false    217    3407    211            ў
           2606    17406 $   branches branches_repository_id_fkey 
   FK CONSTRAINT     ў   ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id) ON DELETE CASCADE;
 N   ALTER TABLE ONLY public.branches DROP CONSTRAINT branches_repository_id_fkey;
       public          democran    false    219    226    3448            Ј
           2606    17411 2   commit_task_links commit_task_links_commit_id_fkey 
   FK CONSTRAINT     §   ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_commit_id_fkey FOREIGN KEY (commit_id) REFERENCES public.commits(id) ON DELETE CASCADE;
 \   ALTER TABLE ONLY public.commit_task_links DROP CONSTRAINT commit_task_links_commit_id_fkey;
       public          democran    false    221    3440    223            ¤
           2606    17416 0   commit_task_links commit_task_links_task_id_fkey 
   FK CONSTRAINT     Ў   ALTER TABLE ONLY public.commit_task_links
    ADD CONSTRAINT commit_task_links_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
 Z   ALTER TABLE ONLY public.commit_task_links DROP CONSTRAINT commit_task_links_task_id_fkey;
       public          democran    false    3401    210    221            Ґ
           2606    17421    commits commits_branch_id_fkey 
   FK CONSTRAINT     •   ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
 H   ALTER TABLE ONLY public.commits DROP CONSTRAINT commits_branch_id_fkey;
       public          democran    false    223    219    3427            ¦
           2606    17426 "   commits commits_repository_id_fkey 
   FK CONSTRAINT         ALTER TABLE ONLY public.commits
    ADD CONSTRAINT commits_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id) ON DELETE CASCADE;
 L   ALTER TABLE ONLY public.commits DROP CONSTRAINT commits_repository_id_fkey;
       public          democran    false    223    3448    226            §
           2606    17431 ,   repositories repositories_assignment_id_fkey 
   FK CONSTRAINT     ©   ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;
 V   ALTER TABLE ONLY public.repositories DROP CONSTRAINT repositories_assignment_id_fkey;
       public          democran    false    3399    226    209            Ё
           2606    17436 )   repositories repositories_created_by_fkey 
   FK CONSTRAINT     ‹   ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
 S   ALTER TABLE ONLY public.repositories DROP CONSTRAINT repositories_created_by_fkey;
       public          democran    false    3407    226    211            ©
           2606    17451 (   task_comments task_comments_task_id_fkey 
   FK CONSTRAINT     ™   ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
 R   ALTER TABLE ONLY public.task_comments DROP CONSTRAINT task_comments_task_id_fkey;
       public          democran    false    210    3401    230            Є
           2606    17456 (   task_comments task_comments_user_id_fkey 
   FK CONSTRAINT     ™   ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 R   ALTER TABLE ONLY public.task_comments DROP CONSTRAINT task_comments_user_id_fkey;
       public          democran    false    230    211    3407            “
           2606    17461    tasks tasks_assignee_id_fkey 
   FK CONSTRAINT        ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);
 F   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_assignee_id_fkey;
       public          democran    false    3407    210    211            ”
           2606    17466    tasks tasks_assignment_id_fkey 
   FK CONSTRAINT     ‰   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);
 H   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_assignment_id_fkey;
       public          democran    false    210    3399    209            •
           2606    17471    tasks tasks_creator_id_fkey 
   FK CONSTRAINT     }   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);
 E   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_creator_id_fkey;
       public          democran    false    210    211    3407            –
           2606    17476    tasks tasks_priority_id_fkey 
   FK CONSTRAINT     ‰   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.task_priorities(id);
 F   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_priority_id_fkey;
       public          democran    false    210    232    3460            —
           2606    17481    tasks tasks_status_id_fkey 
   FK CONSTRAINT     ѓ   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.task_statuses(id);
 D   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_status_id_fkey;
       public          democran    false    234    3464    210            ¬
           2606    17525 3   user_notifications user_notifications_actor_id_fkey 
   FK CONSTRAINT     “   ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);
 ]   ALTER TABLE ONLY public.user_notifications DROP CONSTRAINT user_notifications_actor_id_fkey;
       public          democran    false    241    3407    211            ­
           2606    17530 8   user_notifications user_notifications_assignment_id_fkey 
   FK CONSTRAINT     Ј   ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);
 b   ALTER TABLE ONLY public.user_notifications DROP CONSTRAINT user_notifications_assignment_id_fkey;
       public          democran    false    241    3399    209            «
           2606    17520 7   user_notifications user_notifications_recipient_id_fkey 
   FK CONSTRAINT     ›   ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);
 a   ALTER TABLE ONLY public.user_notifications DROP CONSTRAINT user_notifications_recipient_id_fkey;
       public          democran    false    211    3407    241            
           2606    17486    users users_role_id_fkey 
   FK CONSTRAINT     w   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
 B   ALTER TABLE ONLY public.users DROP CONSTRAINT users_role_id_fkey;
       public          democran    false    228    211    3454            J   n   xњ}NБ
1{“)nЃ"lh.d€›ацџЈ\«ьЄИ–xШЖЖВ. (^чЎЬ—PрЌп—eс fшuЊИфќTЉVX&ШLЊiTFМџ©бфgBpҐю7ѓVgц2o¤]і+ъЄЅµµцXо/      L   z   xњmО;!EСV1АтіЌБ¬%MDhREQцЇ|К0х‘®®'с„$й:зzјЦ-	K-| >о-ъN•)Ь[ю ю:Пu_у¤Cic±ШЙ№yнљaЯ!этВZъЂA]јо¤FХ¤3т…rОo
”,я      G   [   xњ}М1Ђ Fб№њВДТю…"=„'`1бN^_]t#yЫK>(	TЖuФwЈD®Qкё€)gckУE«ґjцrїґ=-ў.Е‰Y[НУхI=…n»ўD      O     xњнќНnгFЂПк§hЇлFWWWяи sX`,ІЮ[ C‘8Ћ6ЙђдЩ‹9мѕИѕB°ЗтОҐљФ?iюHцШ¤и`QlІ«їЄbUw±
ЅеpсгўNчюс·Їїє~Яыw2оЮс‘?їл/'Л»„їхAcџї/’dz3\т‘йГЭ'ГсЭdљћЈ•¦+шs
~Ђ~ Tlуa8№KЖ{­Лбтaq“Ющыhћ—лsц®ѓс: ¤WхЧзОжYгШЗ‡ыqqc­дёЅTF›6.“Ыi’d­!`1љOо—“ЩtGОыщd6џ,Юћ—µьL—«;Ы­hЬЈEЪ|%ЮїfуoЖубкЄЉЏM¦7чуЩн<Y,n“й(Щћѕ9~џМG|ѓбmьQq·•o¬1`•·>_ајe8Я}іэ°¤цJб•6пАт
АK‹^['фКжґ2Ѕї|уччЯ^З+І|рЂlц©Г7Ѕ!kЭZ|Ў€пЄгЧЬqѕX;@&ЗЉш–4Юз«щЖO=ЖVЅ4г2ў»І	м
зЈ&џё'B;Nо’’ЖЁ$™`]Ъя3VѓН8іcШ_їялынГґmиПg9Q*2мvЈЅXu]50F‚чЂ(loЫїEПЄH;;љЭНжQО?Apv¬ы»ZсшїЗЯ~яПпя}ьесяЏї>ю"Ґм—‚Ф<ё‘…¶аБ6ґС|г}q`ЄДVGѕЂGЏВн€у1щш}2зЊ!Њ„ЌЄЖН“&#о_ЄG‹dѕЌ''УO“§:®х -k u”†„лsїяy%5“јџMЗO5З8tp!фХЄ‰ЬѕHn
‡ цдЋFЙ}Nn]%·Ќк¦АyrЗИнКKґB:]nИ№=ЏgшаIHvSЉсяIIHvё†Dґ—.Xн]cџgм@!‡жЦh]ву fM|/"йu т>OHXлы;L5®±З3eqМо(ВBѓЗCѓЗЉ_bр<¤f@ь1Тђ
›)ює№f"
љ"Е'¬P|њuЗxMЪ°Ѕ­ѕz·¶({gх3G Љ¬qьw
¶[Ґ—wjPдФа8ОжJйИЗёзаlЈKЧ(=ес(§ЖС‹#ЌЎЬ©…ЃЃj	ЦЇ,рutв(ЌРU.m=|oэРІЫBј«%iнQ[N&‚!ЄaЧІ7dНбv8HН^ИeSµЛ6NBрЄY(Їг+іUArвDЦVџ
6Ђ=Љ-И”
N[лщП]ЎіqґAў" цСqFr‚kP{~Ё:А*wє–ThУYЈл$Ц.ІaщZЊ†X RT™”­$љОГвєBµcl@Iши	YглВqАqҐATҐлґ»’
m;orќВъ…ЩФЁ9Ќ
pЉГ©`'Ш”›ЬZRAzoҐ…gбТО—®ґ¬Жбi0йњЎОі­В¦yvѕqг••Ѕ	Gн^ЭЕ\Фшвb:Б¦ТЕxKЪ
6&G9“Ј]¬гЫщbщбSнЩ@ЦёjLlw№с9ЪД'ЇQ`L6ЩёГЬT0П&ї(шU¤Ь№–.v_µ'<ГешC<ЦїЦ›gY¶R!yo8h±6®V~>7x^)Usс¦рКЌv-­@uцFЫ-оg#<[o"сMІаoµ·®КfWВ
„Юz…rХБМ‚
Iљ®¬ЇЋ”аfj¤U¶лlНKЌю%W`-At†J—\7Э#<aA§цJ]™6рхn'Уб]ЉfП©ЈЦрJ‹dw‡Fа¶ь=WIҐљ®Д6РRюhe°НЕ]ЖОћ0Јщ,џЅ8rh¶ {3љ}МІvXйc'–ЙOЛќ~N±псЧеь!‰їЁа¶„Ё¤д5iSr§-9и7й№цзUиkТRInмИЦФП·цdТR;4ћЂіЊрП,ЄиZW•
dТ
4зiґ]Ќ&ПЉќ‰Z¬BБЫЋ­ЃGЪ“CЋ§,UЗ|™ґйМm¶kЬП
^¬/'§к%koћ·ЃGЋѓ^_U2»‘V =sЈнч·Ї4§{xVІЈ
Шж0©ЃС®ҐиЮ¶С^ёї–С‚i<¦ќУЗШlVаKОB]ЁwПb›н
РJFПщ¦яQ†йµ0/№кь–и:i(„¶вҐxзСtФ™‘яе* ^‚‘Г€Ўr¶w-¬А—¬ЦzKx»е`;‰Ёc^ІТSa…)xoћrЇP·‰sU‡—БІЫ’*ЋќsЌҐl#†Ц©DЌBuђћ‚s^ИkAБw­)Њ®Ц„ІJћ.QW.б¬ЗAЅу¦ВЎх·z‡A–VГWђЕ3	±:Aw’Q›џ§)"KЬ}†ДPн[SY…1EVБіµM /AVQђU¤Щ8і[#СжрєЛ4ЛMј°-
Ў[J]взўшщ‰J{MКг‹¶Хlл6ѓ—=5ы№=5щ“ЌAPґa[7Ј»l?xёэафI)‡VђКСч№-”}hHїаЖ°)ЖБ:Э(љЛwоIя	F9kw9¦фT_вќзd]г•mҐ"п•”џ-у>ЗЪїлt2Т‡аl#Г^ЖИ4	­0lJхҐC]·зe`+k^Ћ·QА‡™эmKнљўYџ°m	{vДOђЮЄьџ†QШёц¶%ж
Ф;€»ѓg„#:сќBьU$      Q   
   xњ‹Сгвв Е ©      S   
   xњ‹Сгвв Е ©      U   
   xњ‹Сгвв Е ©      d   2  xњ•Q»m1­uSЬ'ђ"Е“n€Lа&…HеЦџ&Rfзcда ц
ФFЎbАpмkи‘"Я‡и0ѓ‹дфX–zР/эhu¬ЇGЭй»~лX–e]ћ\Ђ PR‹2  9¶уњГЯ=IЗInvW—Хы>G‰‰І„њ ZJЯКFч†Ѕ5мг	э¶Љg’ЙюILWr1:}Сѓ)Ык«ЭkЭљ–зЦЈ~А®¬КЄ3ХУ:кѕlю_p"БA‹q TЌ!3…]шC0Х‹HWqN•xHщlx"–^ЂBи9»ыЕьa1ї-дhЋКDГаЃ3¤РT4¬#ЖpЪ†05ё<0E(]ЖШ}4ГПь~Mэё Гu,l“a«¦ћc3уMУь GrБ1      W   
   xњ‹Сгвв Е ©      Y   $   xњ3дLLЙНМг2в,-N-в2жL/M-.бЉСгвв s?h      [   5   xњ37з44bN##3]c]#CC#+S+#C=3s3SNC#cО4®=... И.5      ]   .   xњ3дМЙ/з2вМMMЙ,Не2жМИLПа2бL.К,ЙLNМбЉСгвв Ф\
}      _   6   xњ3дМK-з2вММ‹/(КO/J-.ж2жLЙПKе2бLKММIMб2е,Є‰Сгвв VD
U      H   Р   xњeЏлmГ0„ЛSx<ѕфўd#/dЃ¬ oК5ZHЃвтЋ(%±§сЇc?цсПшњE”г}м‰‰m6Є+Z7нD‰’DЮ™uіN–Ејр_д]ґ›дКЦBрс5ѓ<»©µ(*МЯhAуй
,gF“CNвЌ­ѕ‘lЊµѓ»•¬6·ь"]ЎќKGЛ0«— ЉWЎРЅD
ЯENїФ"жf©яОјLК•TљЭSё	љIYЭ~О¤hЎЄ«В©:Ъeб‘—eщ ЫlUi      f   
   xњ‹Сгвв Е ©      I   Г   xњµђ»‚@Dле+,h№Щ{w—…­H|%Љ-
AўHH_Ї$66TљМLsљ“A†$ъUZћ!«+fSj#·O1uу|№8CxЩ^ЎЭ©•¶Џэ” ЋљЩ-Ю›JЮэТЇіо©ё<aО€'еpэОСHaPЃТ’<5„’и“ь=1AШ7(юЎE†|Cё@®Ѕ!ф­%Шд°ЄЗл4bE™з…"ъ• ц®ГЙAмПQhёйzZёCи[0ЛІ^ў”wK     