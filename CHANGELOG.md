# Changelog

## [2.2.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/project-docs-scaffold-template-v2.1.0...project-docs-scaffold-template-v2.2.0) (2026-02-13)


### Features

* add design resolution document type and proposal-to-design-reso… ([67fd449](https://github.com/ichabodcole/project-docs-scaffold-template/commit/67fd4498de73450b69b2e19bed3d458c77e7e210))
* add design resolution document type and proposal-to-design-resolution workflow ([4cb6c29](https://github.com/ichabodcole/project-docs-scaffold-template/commit/4cb6c293770a1970ad29829e0b0998342da7ef01))

## [2.1.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/project-docs-scaffold-template-v2.0.1...project-docs-scaffold-template-v2.1.0) (2026-02-12)


### Features

* add handoff.md document type for deployment steps ([fb91b6e](https://github.com/ichabodcole/project-docs-scaffold-template/commit/fb91b6ecd0d85609723022d69d5e7603a022fb5b))


### Bug Fixes

* improve v1-to-v2 migration guide based on second round of testing ([5de0452](https://github.com/ichabodcole/project-docs-scaffold-template/commit/5de045264ccbbae54ea9f5b483a0233f74005c79))
* remove CLAUDE_PLUGIN_ROOT dependency from create-recipe skill ([02ca63f](https://github.com/ichabodcole/project-docs-scaffold-template/commit/02ca63fd35a51b4a0d6ec01c48ae6fa9eacffff5))

## [2.0.1](https://github.com/ichabodcole/project-docs-scaffold-template/compare/project-docs-scaffold-template-v2.0.0...project-docs-scaffold-template-v2.0.1) (2026-02-10)


### Bug Fixes

* improve v1-to-v2 migration guide and skill file references ([aa71e6e](https://github.com/ichabodcole/project-docs-scaffold-template/commit/aa71e6e18f7edf21a5cb217befc91ae7c530029c))
* improve v1-to-v2 migration guide and skill file references ([151d167](https://github.com/ichabodcole/project-docs-scaffold-template/commit/151d167903388f9299a899f959b5d90793392ba7))

## [2.0.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/project-docs-scaffold-template-v1.8.0...project-docs-scaffold-template-v2.0.0) (2026-02-10)


### ⚠ BREAKING CHANGES

* Documentation structure has changed. Flat directories (proposals/, plans/, sessions/) are replaced by co-located project folders (projects/<name>/) containing proposal.md, plan.md, and sessions/ together. New directories: backlog/, memories/. Use the update-project-docs skill to migrate existing docs from v1 to v2.

### Features

* add archive folders and review-docs command ([2a2918c](https://github.com/ichabodcole/project-docs-scaffold-template/commit/2a2918ccdd30cb1f71c59d4733f5840709b01eb3))
* add archive folders and review-docs command ([3f3148e](https://github.com/ichabodcole/project-docs-scaffold-template/commit/3f3148e6d2c2ce891c0fc5e04e9485a255fb5744))
* add elysia-betterauth-oauth skill ([b4693b2](https://github.com/ichabodcole/project-docs-scaffold-template/commit/b4693b2d9289b61bfd94aa51a67efd86b2344f0a))
* add fragments document type for incomplete observations ([62532af](https://github.com/ichabodcole/project-docs-scaffold-template/commit/62532af53eba9da5a511c727f7a3797cd396bce4))
* add fragments document type for incomplete observations ([b94b52b](https://github.com/ichabodcole/project-docs-scaffold-template/commit/b94b52b11812a5e6c632c40ff1a9c69833f4d279))
* add interaction-design documentation directory ([9088946](https://github.com/ichabodcole/project-docs-scaffold-template/commit/9088946c4a9f1a82e84570ce317ad5dd57bb11de))
* add optional Braindump integration ([12a8da4](https://github.com/ichabodcole/project-docs-scaffold-template/commit/12a8da4ad3f55e338d06b64d1f2eda401a5c972a))
* add PROJECT_MANIFESTO.md foundational document ([8305ff9](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8305ff991faa39455808579be756b4d4093efaa1))
* add project-summary and project-recipe commands ([8b7bbe8](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8b7bbe89fbf11ede58868845bb0f31b0c869955b))
* add project-summary and project-recipe commands ([88f33d0](https://github.com/ichabodcole/project-docs-scaffold-template/commit/88f33d0794807933c1f1877411beae05c4ec2fcb))
* add recipes plugin with reusable project recipe skills ([bd3775d](https://github.com/ichabodcole/project-docs-scaffold-template/commit/bd3775df171f71201c14883680bd03994e5f3de7))
* add recipes plugin with reusable project recipe skills ([2ac7a82](https://github.com/ichabodcole/project-docs-scaffold-template/commit/2ac7a825f1cc855208f1b7acd25b61f6d0524a8b))
* add reports documentation folder and update review-docs command ([9698104](https://github.com/ichabodcole/project-docs-scaffold-template/commit/96981042c961cbcf4ebb95f0f2f783f8ca659f44))
* add reports documentation folder and update review-docs command ([8174467](https://github.com/ichabodcole/project-docs-scaffold-template/commit/817446793d40ddd8a295a4dc19654e55a7540743))
* add update-deps agent commands ([a6d3864](https://github.com/ichabodcole/project-docs-scaffold-template/commit/a6d386418bbf3607390e37f348bf08439d60cf59))
* migrate to Claude Code plugin system and add specifications doc type ([0103c57](https://github.com/ichabodcole/project-docs-scaffold-template/commit/0103c57b55e507c90f2df6ab1143c9a68c3f5bfe))
* **recipes:** add 7 recipe skills extracted from Operator monorepo ([91579ec](https://github.com/ichabodcole/project-docs-scaffold-template/commit/91579ecbdf8520729012600600a61dc1702a10aa))
* restructure documentation from flat dirs to co-located project folders ([da9d5d1](https://github.com/ichabodcole/project-docs-scaffold-template/commit/da9d5d1b2ac85eab633cfd23757116ba8464f844))


### Bug Fixes

* clarify Braindump MCP only works with Claude Code, not Claude Desktop ([544b4d7](https://github.com/ichabodcole/project-docs-scaffold-template/commit/544b4d73d3fe984e100ee83643d21972d36258de))
* correct Braindump MCP server configuration to use HTTP transport ([0a4c710](https://github.com/ichabodcole/project-docs-scaffold-template/commit/0a4c7103f2137dea2525f8b8f293f127395dc992))
* remove stale include_operator_docs references from template ([8c4e84e](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8c4e84eb8b42e97ab9a130aaa75a72a309f77ae4))
* remove stale include_operator_docs references from template ([8dfbf78](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8dfbf780089e765d1dfe25905d59ab09f21fa775))
* skill naming format must be dashed and lowercase ([59ae509](https://github.com/ichabodcole/project-docs-scaffold-template/commit/59ae5097c36f2c3865deb334fa550bb10711608c))
* skill naming format must be dashed and lowercase ([037746c](https://github.com/ichabodcole/project-docs-scaffold-template/commit/037746c68c7e833c5635097dfedc107e0c4196d4))

## [1.8.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.7.1...v1.8.0) (2026-02-09)


### Features

* add elysia-betterauth-oauth skill ([b4693b2](https://github.com/ichabodcole/project-docs-scaffold-template/commit/b4693b2d9289b61bfd94aa51a67efd86b2344f0a))
* **recipes:** add 7 recipe skills extracted from Operator monorepo ([91579ec](https://github.com/ichabodcole/project-docs-scaffold-template/commit/91579ecbdf8520729012600600a61dc1702a10aa))

## [1.7.1](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.7.0...v1.7.1) (2026-02-07)


### Bug Fixes

* skill naming format must be dashed and lowercase ([59ae509](https://github.com/ichabodcole/project-docs-scaffold-template/commit/59ae5097c36f2c3865deb334fa550bb10711608c))

## [1.7.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.6.1...v1.7.0) (2026-02-07)


### Features

* add recipes plugin with reusable project recipe skills ([bd3775d](https://github.com/ichabodcole/project-docs-scaffold-template/commit/bd3775df171f71201c14883680bd03994e5f3de7))
* add recipes plugin with reusable project recipe skills ([2ac7a82](https://github.com/ichabodcole/project-docs-scaffold-template/commit/2ac7a825f1cc855208f1b7acd25b61f6d0524a8b))

## [1.6.1](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.6.0...v1.6.1) (2026-02-06)


### Bug Fixes

* remove stale include_operator_docs references from template ([8c4e84e](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8c4e84eb8b42e97ab9a130aaa75a72a309f77ae4))
* remove stale include_operator_docs references from template ([8dfbf78](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8dfbf780089e765d1dfe25905d59ab09f21fa775))

## [1.6.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.5.0...v1.6.0) (2026-02-06)


### Features

* migrate to Claude Code plugin system and add specifications doc type ([0103c57](https://github.com/ichabodcole/project-docs-scaffold-template/commit/0103c57b55e507c90f2df6ab1143c9a68c3f5bfe))

## [1.5.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.4.0...v1.5.0) (2025-11-29)


### Features

* add interaction-design documentation directory ([9088946](https://github.com/ichabodcole/project-docs-scaffold-template/commit/9088946c4a9f1a82e84570ce317ad5dd57bb11de))
* add PROJECT_MANIFESTO.md foundational document ([8305ff9](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8305ff991faa39455808579be756b4d4093efaa1))

## [1.4.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.3.0...v1.4.0) (2025-11-15)


### Features

* add project-summary and project-recipe commands ([8b7bbe8](https://github.com/ichabodcole/project-docs-scaffold-template/commit/8b7bbe89fbf11ede58868845bb0f31b0c869955b))
* add project-summary and project-recipe commands ([88f33d0](https://github.com/ichabodcole/project-docs-scaffold-template/commit/88f33d0794807933c1f1877411beae05c4ec2fcb))

## [1.3.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.2.0...v1.3.0) (2025-11-14)


### Features

* add reports documentation folder and update review-docs command ([9698104](https://github.com/ichabodcole/project-docs-scaffold-template/commit/96981042c961cbcf4ebb95f0f2f783f8ca659f44))
* add reports documentation folder and update review-docs command ([8174467](https://github.com/ichabodcole/project-docs-scaffold-template/commit/817446793d40ddd8a295a4dc19654e55a7540743))

## [1.2.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.1.0...v1.2.0) (2025-11-12)

### Features

- add archive folders and review-docs command
  ([2a2918c](https://github.com/ichabodcole/project-docs-scaffold-template/commit/2a2918ccdd30cb1f71c59d4733f5840709b01eb3))
- add archive folders and review-docs command
  ([3f3148e](https://github.com/ichabodcole/project-docs-scaffold-template/commit/3f3148e6d2c2ce891c0fc5e04e9485a255fb5744))
- add fragments document type for incomplete observations
  ([62532af](https://github.com/ichabodcole/project-docs-scaffold-template/commit/62532af53eba9da5a511c727f7a3797cd396bce4))
- add fragments document type for incomplete observations
  ([b94b52b](https://github.com/ichabodcole/project-docs-scaffold-template/commit/b94b52b11812a5e6c632c40ff1a9c69833f4d279))

## [1.1.0](https://github.com/ichabodcole/project-docs-scaffold-template/compare/v1.0.0...v1.1.0) (2025-10-25)

### Features

- add optional Operator integration
  ([12a8da4](https://github.com/ichabodcole/project-docs-scaffold-template/commit/12a8da4ad3f55e338d06b64d1f2eda401a5c972a))

### Bug Fixes

- clarify Operator MCP only works with Claude Code, not Claude Desktop
  ([544b4d7](https://github.com/ichabodcole/project-docs-scaffold-template/commit/544b4d73d3fe984e100ee83643d21972d36258de))
- correct Operator MCP server configuration to use HTTP transport
  ([0a4c710](https://github.com/ichabodcole/project-docs-scaffold-template/commit/0a4c7103f2137dea2525f8b8f293f127395dc992))

## 1.0.0 (2025-10-10)

### Features

- add update-deps agent commands
  ([a6d3864](https://github.com/ichabodcole/project-docs-scaffold-template/commit/a6d386418bbf3607390e37f348bf08439d60cf59))
