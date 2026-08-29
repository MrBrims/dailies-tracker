export const PATHS = {
  sourcePath:
    process.env.SOURCE_PATH?.replace(/\\/g, "/") ||
    "Задачи и заметки/Дейлики и задачи/Дейлики.md",
  tablePath:
    process.env.TABLE_PATH?.replace(/\\/g, "/") ||
    "Задачи и заметки/Дейлики и задачи/Таблица дейликов.md",
  archiveFolder:
    process.env.ARCHIVE_FOLDER?.replace(/\\/g, "/") ||
    "Задачи и заметки/Дейлики и задачи/Архив дейликов",
};
