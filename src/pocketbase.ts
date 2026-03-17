import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://api-moc.atipd.tw');
pb.autoCancellation(false);
