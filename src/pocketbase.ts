import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://43.160.229.239:8090');

pb.autoCancellation(false);