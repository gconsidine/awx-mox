awx-mox
==

#### Requirements

  - Dockerized AWX API up and running
  - Node.js LTS
  - npm

#### Usage

  Using default values set in `lib/defaults.js`, the commands do the following:

  `mox user`

  Creates:
    - user
    - credential
    - organization
    - sets user role

  `mox project`

  Creates:
    - project
    - inventory (sm, md, lg, xl)
    - hosts (all localhost) associated with the inventories and their sizes (5, 100, 500, 1000)
    - templates (sm-0, sm-1, sm2, md-0, md-1, ... xl-2) where the number represents verbosity

#### Notes

  Defaults can be overridden by using options. Use `mox --help` for more info.
