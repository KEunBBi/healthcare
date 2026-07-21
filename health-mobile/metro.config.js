const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// health-mobile은 healthcare 모노레포의 shared/ 폴더(타입·순수 유틸)를 참조한다(ARCHITECTURE.md 4장).
// Metro는 기본적으로 project root 밖의 파일을 resolve하지 못하므로 watchFolders에 필요한 폴더만 추가한다.
// 모노레포 루트 전체(healthcare/)를 추가하면 health-backend·health-web 등 다른 프로젝트의
// node_modules까지 Metro가 크롤링하게 되어 매우 느려지므로, shared/ 폴더만 명시적으로 추가한다.
const sharedRoot = path.resolve(projectRoot, '..', 'shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
