import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";

/*
|--------------------------------------------------------------------------
| Request validation
|--------------------------------------------------------------------------
*/

const requestSchema = z.object({
    command: z.string().trim().min(1, "Command is required."),
    adminEmail: z
        .string()
        .trim()
        .email("A valid administrator email is required."),
});

/*
|--------------------------------------------------------------------------
| Shared types
|--------------------------------------------------------------------------
*/

type CommandResult = {
    success: boolean;
    message: string;
    action: string;
    targetEmail?: string;
};

type ParsedCommand = {
    action:
    | "add_user"
    | "update_user"
    | "delete_user"
    | "find_user"
    | "list_users"
    | "unknown";

    email: string | null;
    fullName: string | null;
    phone: string | null;
    city: string | null;

    updateField:
    | "full_name"
    | "email"
    | "phone"
    | "city"
    | null;

    updateValue: string | null;
    message: string;
};

/*
|--------------------------------------------------------------------------
| Main POST endpoint
|--------------------------------------------------------------------------
*/

export async function POST(request: Request) {
    try {
        /*
        |--------------------------------------------------------------------------
        | 1. Read and validate the incoming request
        |--------------------------------------------------------------------------
        */

        const body: unknown = await request.json();
        const validation = requestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        validation.error.issues[0]?.message ??
                        "The supplied request is invalid.",
                },
                { status: 400 }
            );
        }

        const command = validation.data.command;
        const adminEmail =
            validation.data.adminEmail.toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | 2. Verify that the supplied email belongs to an administrator
        |--------------------------------------------------------------------------
        */

        const { data: admin, error: adminError } =
            await supabaseAdmin
                .from("admins")
                .select("id, email")
                .eq("email", adminEmail)
                .maybeSingle();

        if (adminError) {
            console.error(
                "Admin verification error:",
                adminError
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "The administrator could not be verified.",
                },
                { status: 500 }
            );
        }

        if (!admin) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Access denied. Administrator not found.",
                },
                { status: 403 }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Interpret and execute the command
        |--------------------------------------------------------------------------
        */

        const result = await processCommand(command);

        console.log("Rule-based command result:", {
            action: result.action,
            success: result.success,
        });

        /*
        |--------------------------------------------------------------------------
        | 4. Store activity and chat history
        |--------------------------------------------------------------------------
        */

        await saveActivityLog({
            adminEmail: admin.email,
            action: result.action,
            targetEmail: result.targetEmail ?? null,
            command,
            status: result.success
                ? "success"
                : "failed",
        });

        await saveChatMessage(
            admin.email,
            "admin",
            command
        );

        await saveChatMessage(
            admin.email,
            "bot",
            result.message
        );

        /*
        |--------------------------------------------------------------------------
        | 5. Return the chatbot response
        |--------------------------------------------------------------------------
        */

        return NextResponse.json(result, {
            status: result.success ? 200 : 400,
        });
    } catch (error) {
        console.error("Chat API error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "An unexpected server error occurred.";

        return NextResponse.json(
            {
                success: false,
                message: `The command could not be processed. ${message}`,
            },
            { status: 500 }
        );
    }
}

/*
|--------------------------------------------------------------------------
| Rule-based command interpreter
|--------------------------------------------------------------------------
*/

async function processCommand(
    command: string
): Promise<CommandResult> {
    const normalized = command
        .toLowerCase()
        .trim();

    /*
    |--------------------------------------------------------------------------
    | List users
    |--------------------------------------------------------------------------
    */

    if (
        normalized.includes("list users") ||
        normalized.includes("list all users") ||
        normalized.includes("show all users") ||
        normalized.includes("display all users") ||
        normalized.includes("registered users") ||
        normalized.includes("all registered users") ||
        normalized === "users"
    ) {
        return listUsers();
    }

    /*
    |--------------------------------------------------------------------------
    | Delete user
    |--------------------------------------------------------------------------
    */

    if (
        normalized.includes("delete") ||
        normalized.includes("remove")
    ) {
        const parsed: ParsedCommand = {
            action: "delete_user",
            email: extractEmail(command),
            fullName: extractDeleteName(command),
            phone: null,
            city: null,
            updateField: null,
            updateValue: null,
            message: "Delete user command.",
        };

        return deleteUser(parsed);
    }

    /*
    |--------------------------------------------------------------------------
    | Update user
    |--------------------------------------------------------------------------
    */

    if (
        normalized.includes("update") ||
        normalized.includes("change") ||
        normalized.includes("modify")
    ) {
        const updateInformation =
            extractUpdateInformation(command);

        const parsed: ParsedCommand = {
            action: "update_user",
            email: extractTargetEmailForUpdate(command),
            fullName: extractUpdateTargetName(command),
            phone: null,
            city: null,
            updateField: updateInformation.field,
            updateValue: updateInformation.value,
            message: "Update user command.",
        };

        return updateUser(parsed);
    }

    /*
    |--------------------------------------------------------------------------
    | Add user
    |--------------------------------------------------------------------------
    */

    if (
        normalized.includes("add") ||
        normalized.includes("create") ||
        normalized.includes("register") ||
        normalized.includes("insert")
    ) {
        const parsed: ParsedCommand = {
            action: "add_user",
            email: extractEmail(command),
            fullName: extractAddName(command),
            phone: extractPhone(command),
            city: extractAddCity(command),
            updateField: null,
            updateValue: null,
            message: "Add user command.",
        };

        return addUser(parsed);
    }

    /*
    |--------------------------------------------------------------------------
    | Find user
    |--------------------------------------------------------------------------
    */

    if (
        normalized.includes("find") ||
        normalized.includes("search") ||
        normalized.includes("locate") ||
        normalized.includes("show user") ||
        normalized.includes("get user")
    ) {
        const parsed: ParsedCommand = {
            action: "find_user",
            email: extractEmail(command),
            fullName: extractFindName(command),
            phone: null,
            city: null,
            updateField: null,
            updateValue: null,
            message: "Find user command.",
        };

        return findUser(parsed);
    }

    return {
        success: false,
        action: "unknown",
        message:
            "I could not understand that command. Try adding, updating, deleting, finding, or listing users.",
    };
}

/*
|--------------------------------------------------------------------------
| Add user
|--------------------------------------------------------------------------
*/

async function addUser(
    parsed: ParsedCommand
): Promise<CommandResult> {
    if (!parsed.email) {
        return {
            success: false,
            action: "add_user",
            message:
                "Please provide an email address for the new user.",
        };
    }

    const email = parsed.email
        .trim()
        .toLowerCase();

    const { data: existingUser, error: lookupError } =
        await supabaseAdmin
            .from("users")
            .select("id, email")
            .eq("email", email)
            .maybeSingle();

    if (lookupError) {
        console.error(
            "Add-user lookup error:",
            lookupError
        );

        return {
            success: false,
            action: "add_user",
            targetEmail: email,
            message:
                "I could not check whether that user already exists.",
        };
    }

    if (existingUser) {
        return {
            success: false,
            action: "add_user",
            targetEmail: email,
            message: `A user with the email ${email} already exists.`,
        };
    }

    const { data: newUser, error: insertError } =
        await supabaseAdmin
            .from("users")
            .insert({
                email,
                full_name: parsed.fullName,
                phone: parsed.phone,
                city: parsed.city,
            })
            .select(
                "id, full_name, email, phone, city"
            )
            .single();

    if (insertError) {
        console.error(
            "Add-user error:",
            insertError
        );

        return {
            success: false,
            action: "add_user",
            targetEmail: email,
            message: `I could not add ${email}. ${insertError.message}`,
        };
    }

    const details = [
        newUser.full_name
            ? `name: ${newUser.full_name}`
            : null,
        newUser.phone
            ? `phone: ${newUser.phone}`
            : null,
        newUser.city
            ? `city: ${newUser.city}`
            : null,
    ].filter(Boolean);

    return {
        success: true,
        action: "add_user",
        targetEmail: email,
        message:
            details.length > 0
                ? `User ${email} was added successfully with ${details.join(
                    ", "
                )}.`
                : `User ${email} was added successfully.`,
    };
}

/*
|--------------------------------------------------------------------------
| Update user
|--------------------------------------------------------------------------
*/

async function updateUser(
    parsed: ParsedCommand
): Promise<CommandResult> {
    if (!parsed.email && !parsed.fullName) {
        return {
            success: false,
            action: "update_user",
            message:
                "Please identify the user by email address or full name.",
        };
    }

    if (
        !parsed.updateField ||
        !parsed.updateValue
    ) {
        return {
            success: false,
            action: "update_user",
            message:
                "Please specify the field that should be updated and its new value.",
        };
    }

    let lookupQuery = supabaseAdmin
        .from("users")
        .select(
            "id, full_name, email, phone, city"
        );

    if (parsed.email) {
        lookupQuery = lookupQuery.eq(
            "email",
            parsed.email.toLowerCase()
        );
    } else {
        lookupQuery = lookupQuery.ilike(
            "full_name",
            parsed.fullName!
        );
    }

    const {
        data: matchingUsers,
        error: lookupError,
    } = await lookupQuery;

    if (lookupError) {
        console.error(
            "Update-user lookup error:",
            lookupError
        );

        return {
            success: false,
            action: "update_user",
            targetEmail:
                parsed.email ?? undefined,
            message:
                "I could not search for that user.",
        };
    }

    if (
        !matchingUsers ||
        matchingUsers.length === 0
    ) {
        return {
            success: false,
            action: "update_user",
            targetEmail:
                parsed.email ?? undefined,
            message: parsed.email
                ? `No user was found with the email ${parsed.email}.`
                : `No user was found with the name ${parsed.fullName}.`,
        };
    }

    if (matchingUsers.length > 1) {
        return {
            success: false,
            action: "update_user",
            message: `More than one user is named ${parsed.fullName}. Please provide the user's email address.`,
        };
    }

    const user = matchingUsers[0];

    const updateValue =
        parsed.updateField === "email"
            ? parsed.updateValue.toLowerCase()
            : parsed.updateValue;

    const updates: Record<string, string> = {
        [parsed.updateField]: updateValue,
        updated_at: new Date().toISOString(),
    };

    const { error: updateError } =
        await supabaseAdmin
            .from("users")
            .update(updates)
            .eq("id", user.id);

    if (updateError) {
        console.error(
            "Update-user error:",
            updateError
        );

        return {
            success: false,
            action: "update_user",
            targetEmail: user.email,
            message: `I could not update ${user.email}. ${updateError.message}`,
        };
    }

    const readableField =
        getReadableFieldName(
            parsed.updateField
        );

    return {
        success: true,
        action: "update_user",
        targetEmail:
            parsed.updateField === "email"
                ? updateValue
                : user.email,
        message: `${user.full_name || user.email
            }'s ${readableField} was updated to ${updateValue} successfully.`,
    };
}

/*
|--------------------------------------------------------------------------
| Delete user
|--------------------------------------------------------------------------
*/

async function deleteUser(
    parsed: ParsedCommand
): Promise<CommandResult> {
    if (!parsed.email && !parsed.fullName) {
        return {
            success: false,
            action: "delete_user",
            message:
                "Please identify the user by email address or full name.",
        };
    }

    let lookupQuery = supabaseAdmin
        .from("users")
        .select("id, full_name, email");

    if (parsed.email) {
        lookupQuery = lookupQuery.eq(
            "email",
            parsed.email.toLowerCase()
        );
    } else {
        lookupQuery = lookupQuery.ilike(
            "full_name",
            parsed.fullName!
        );
    }

    const {
        data: matchingUsers,
        error: lookupError,
    } = await lookupQuery;

    if (lookupError) {
        console.error(
            "Delete-user lookup error:",
            lookupError
        );

        return {
            success: false,
            action: "delete_user",
            targetEmail:
                parsed.email ?? undefined,
            message:
                "I could not search for that user.",
        };
    }

    if (
        !matchingUsers ||
        matchingUsers.length === 0
    ) {
        return {
            success: false,
            action: "delete_user",
            targetEmail:
                parsed.email ?? undefined,
            message:
                "No matching user was found.",
        };
    }

    if (matchingUsers.length > 1) {
        return {
            success: false,
            action: "delete_user",
            message: `More than one user is named ${parsed.fullName}. Please provide the user's email address.`,
        };
    }

    const user = matchingUsers[0];

    const { error: deleteError } =
        await supabaseAdmin
            .from("users")
            .delete()
            .eq("id", user.id);

    if (deleteError) {
        console.error(
            "Delete-user error:",
            deleteError
        );

        return {
            success: false,
            action: "delete_user",
            targetEmail: user.email,
            message: `I could not remove ${user.email}. ${deleteError.message}`,
        };
    }

    return {
        success: true,
        action: "delete_user",
        targetEmail: user.email,
        message: `User ${user.email} was removed successfully.`,
    };
}

/*
|--------------------------------------------------------------------------
| Find user
|--------------------------------------------------------------------------
*/

async function findUser(
    parsed: ParsedCommand
): Promise<CommandResult> {
    if (!parsed.email && !parsed.fullName) {
        return {
            success: false,
            action: "find_user",
            message:
                "Please provide the user's email address or full name.",
        };
    }

    let lookupQuery = supabaseAdmin
        .from("users")
        .select(
            "id, full_name, email, phone, city, created_at"
        );

    if (parsed.email) {
        lookupQuery = lookupQuery.eq(
            "email",
            parsed.email.toLowerCase()
        );
    } else {
        lookupQuery = lookupQuery.ilike(
            "full_name",
            `%${parsed.fullName}%`
        );
    }

    const { data: users, error: lookupError } =
        await lookupQuery.limit(10);

    if (lookupError) {
        console.error(
            "Find-user error:",
            lookupError
        );

        return {
            success: false,
            action: "find_user",
            targetEmail:
                parsed.email ?? undefined,
            message:
                "I could not search for that user.",
        };
    }

    if (!users || users.length === 0) {
        return {
            success: false,
            action: "find_user",
            targetEmail:
                parsed.email ?? undefined,
            message:
                "No matching user was found.",
        };
    }

    return {
        success: true,
        action: "find_user",
        targetEmail:
            parsed.email ?? users[0]?.email,
        message: users
            .map(formatUser)
            .join("\n\n"),
    };
}

/*
|--------------------------------------------------------------------------
| List all users
|--------------------------------------------------------------------------
*/

async function listUsers(): Promise<CommandResult> {
    const { data: users, error } =
        await supabaseAdmin
            .from("users")
            .select(
                "id, full_name, email, phone, city, created_at"
            )
            .order("created_at", {
                ascending: false,
            })
            .limit(20);

    if (error) {
        console.error(
            "List-users error:",
            error
        );

        return {
            success: false,
            action: "list_users",
            message:
                "I could not retrieve the users.",
        };
    }

    if (!users || users.length === 0) {
        return {
            success: true,
            action: "list_users",
            message:
                "There are currently no users in the system.",
        };
    }

    const formattedUsers = users.map(
        (user, index) =>
            `${index + 1}. ${formatUser(user)}`
    );

    return {
        success: true,
        action: "list_users",
        message: `I found ${users.length} user${users.length === 1 ? "" : "s"
            }:\n\n${formattedUsers.join(
                "\n\n"
            )}`,
    };
}

/*
|--------------------------------------------------------------------------
| Command extraction helpers
|--------------------------------------------------------------------------
*/

function extractEmail(
    command: string
): string | null {
    const match = command.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    return match
        ? match[0].toLowerCase()
        : null;
}

function extractTargetEmailForUpdate(
    command: string
): string | null {
    const emails =
        command.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
        ) ?? [];

    if (emails.length === 0) {
        return null;
    }

    /*
     * If two emails are present, the first email is treated
     * as the current user identifier and the second as the
     * new email value.
     */
    return emails[0]?.toLowerCase() ?? null;
}

function extractPhone(
    command: string
): string | null {
    const labelledPhone = command.match(
        /(?:phone number|phone|mobile|contact number)\s*(?:is|:|=)?\s*["']?(\+?\d[\d\s-]{5,18})["']?/i
    );

    if (labelledPhone?.[1]) {
        return cleanPhone(
            labelledPhone[1]
        );
    }

    const generalPhone = command.match(
        /(?:\+92|0092|92|0)?3\d{2}[\s-]?\d{7}/
    );

    return generalPhone
        ? cleanPhone(generalPhone[0])
        : null;
}

function cleanPhone(
    phone: string
): string {
    return phone
        .replace(/[^\d+]/g, "")
        .trim();
}

function extractAddName(
    command: string
): string | null {
    const patterns = [
        /(?:named|name is|name:)\s*["']?([a-z][a-z\s.'-]*?)(?=\s+(?:with|email|phone|mobile|city|from|living|who)|[,.;]|$)/i,

        /(?:add|create|register|insert)(?:\s+a)?(?:\s+new)?\s+user\s+["']?([a-z][a-z\s.'-]*?)(?=\s+(?:with|email|phone|mobile|city|from)|[,.;]|$)/i,
    ];

    for (const pattern of patterns) {
        const match =
            command.match(pattern);

        if (match?.[1]) {
            const cleanedName =
                cleanName(match[1]);

            if (
                cleanedName &&
                !cleanedName.includes("@")
            ) {
                return cleanedName;
            }
        }
    }

    return null;
}

function extractAddCity(
    command: string
): string | null {
    const match = command.match(
        /(?:city|lives in|living in|from)\s*(?:is|:|=)?\s*["']?([a-z][a-z\s.'-]*?)(?=\s+(?:with|email|phone|mobile)|[,.;]|$)/i
    );

    return match?.[1]
        ? cleanTextValue(match[1])
        : null;
}

function extractDeleteName(
    command: string
): string | null {
    if (extractEmail(command)) {
        return null;
    }

    const match = command.match(
        /(?:delete|remove)\s+(?:the\s+)?(?:user\s+)?["']?([a-z][a-z\s.'-]*?)["']?\s*(?:from\s+(?:the\s+)?system)?[.!]?$/i
    );

    return match?.[1]
        ? cleanName(match[1])
        : null;
}

function extractFindName(
    command: string
): string | null {
    if (extractEmail(command)) {
        return null;
    }

    const match = command.match(
        /(?:find|search(?:\s+for)?|locate|show|get)\s+(?:the\s+)?(?:user\s+)?["']?([a-z][a-z\s.'-]*?)["']?[.!]?$/i
    );

    return match?.[1]
        ? cleanName(match[1])
        : null;
}

function extractUpdateTargetName(
    command: string
): string | null {
    if (extractTargetEmailForUpdate(command)) {
        return null;
    }

    const possessiveMatch = command.match(
        /(?:update|change|modify)\s+["']?([a-z][a-z\s.'-]*?)["']?'s\s+(?:full\s+name|name|email|email address|phone|phone number|city)/i
    );

    if (possessiveMatch?.[1]) {
        return cleanName(
            possessiveMatch[1]
        );
    }

    const directMatch = command.match(
        /(?:update|change|modify)\s+(?:the\s+)?(?:user\s+)?["']?([a-z][a-z\s.'-]*?)["']?\s+(?:city|phone|phone number|email|email address|name|full name)/i
    );

    return directMatch?.[1]
        ? cleanName(directMatch[1])
        : null;
}

function extractUpdateInformation(
    command: string
): {
    field:
    | "full_name"
    | "email"
    | "phone"
    | "city"
    | null;

    value: string | null;
} {
    const cityMatch = command.match(
        /(?:city)\s+(?:to|as|is now|=)\s*["']?([^"',.;]+)["']?/i
    );

    if (cityMatch?.[1]) {
        return {
            field: "city",
            value: cleanTextValue(
                cityMatch[1]
            ),
        };
    }

    const phoneMatch = command.match(
        /(?:phone number|phone|mobile|contact number)\s+(?:to|as|is now|=)\s*["']?(\+?[\d\s-]+)["']?/i
    );

    if (phoneMatch?.[1]) {
        return {
            field: "phone",
            value: cleanPhone(
                phoneMatch[1]
            ),
        };
    }

    const emailMatches =
        command.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
        ) ?? [];

    const emailUpdateMatch = command.match(
        /(?:email|email address)\s+(?:to|as|is now|=)\s*["']?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})["']?/i
    );

    if (emailUpdateMatch?.[1]) {
        return {
            field: "email",
            value:
                emailUpdateMatch[1].toLowerCase(),
        };
    }

    if (
        emailMatches.length >= 2 &&
        /\b(?:update|change|modify)\b/i.test(
            command
        )
    ) {
        return {
            field: "email",
            value:
                emailMatches[1].toLowerCase(),
        };
    }

    const nameMatch = command.match(
        /(?:full name|name)\s+(?:to|as|is now|=)\s*["']?([^"',.;]+)["']?/i
    );

    if (nameMatch?.[1]) {
        return {
            field: "full_name",
            value: cleanTextValue(
                nameMatch[1]
            ),
        };
    }

    return {
        field: null,
        value: null,
    };
}

function cleanName(
    value: string
): string {
    return cleanTextValue(value)
        .replace(
            /^(?:the\s+)?user\s+/i,
            ""
        )
        .replace(/\s+/g, " ")
        .trim();
}

function cleanTextValue(
    value: string
): string {
    return value
        .replace(
            /^["'\s]+|["'\s]+$/g,
            ""
        )
        .replace(/[.,;!?]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/*
|--------------------------------------------------------------------------
| Formatting helpers
|--------------------------------------------------------------------------
*/

function getReadableFieldName(
    field: string
): string {
    switch (field) {
        case "full_name":
            return "full name";

        case "email":
            return "email address";

        case "phone":
            return "phone number";

        case "city":
            return "city";

        default:
            return field;
    }
}

function formatUser(user: {
    full_name: string | null;
    email: string;
    phone: string | null;
    city: string | null;
}): string {
    return [
        user.full_name
            ? `Name: ${user.full_name}`
            : "Name: Not provided",

        `Email: ${user.email}`,

        user.phone
            ? `Phone: ${user.phone}`
            : "Phone: Not provided",

        user.city
            ? `City: ${user.city}`
            : "City: Not provided",
    ].join(" | ");
}

/*
|--------------------------------------------------------------------------
| Activity log
|--------------------------------------------------------------------------
*/

async function saveActivityLog({
    adminEmail,
    action,
    targetEmail,
    command,
    status,
}: {
    adminEmail: string;
    action: string;
    targetEmail: string | null;
    command: string;
    status: string;
}) {
    const { error } = await supabaseAdmin
        .from("activity_logs")
        .insert({
            admin_email: adminEmail,
            action,
            target_email: targetEmail,
            command,
            status,
        });

    if (error) {
        console.error(
            "Activity-log error:",
            error
        );
    }
}

/*
|--------------------------------------------------------------------------
| Chat-message history
|--------------------------------------------------------------------------
*/

async function saveChatMessage(
    adminEmail: string,
    sender: "admin" | "bot",
    message: string
) {
    const { error } = await supabaseAdmin
        .from("chat_messages")
        .insert({
            admin_email: adminEmail,
            sender,
            message,
        });

    if (error) {
        console.error(
            "Chat-message error:",
            error
        );
    }
}