begin;

with incoming as (
  select * from (values
    ('Anders Admin','anders.admin@lmk.no','90000000','https://img.lmk.no/u/anders.admin.jpg','80000000000','1980','1980-01-01','Lillesandsveien 1','4790','Lillesand','true','true','admin'),
    ('Anders Haugen','anders.haugen@lmk.no','90000001','https://img.lmk.no/u/anders.haugen.jpg','80000000001','1985','1985-05-12','Storgata 5','4790','Lillesand','false','true','member'),
    ('Anders Sørensen','anders.s.rensen@lmk.no','90000002','https://img.lmk.no/u/anders.s.rensen.jpg','80000000002','1978','1978-08-23','Havnegata 10','4790','Lillesand','false','true','member'),
    ('Anne Strand','anne.strand@lmk.no','90000003','https://img.lmk.no/u/anne.strand.jpg','80000000003','1992','1992-03-15','Strandveien 2','4790','Lillesand','false','true','member'),
    ('Anne Sørensen','anne.s.rensen@lmk.no','90000004','https://img.lmk.no/u/anne.s.rensen.jpg','80000000004','1988','1988-11-30','Kirkegata 4','4790','Lillesand','false','true','member'),
    ('Arne Larsen','arne.larsen@lmk.no','90000005','https://img.lmk.no/u/arne.larsen.jpg','80000000005','1975','1975-07-05','Skoleveien 8','4790','Lillesand','false','true','member'),
    ('Arne Nilsen','arne.nilsen@lmk.no','90000006','https://img.lmk.no/u/arne.nilsen.jpg','80000000006','1982','1982-09-18','Parkveien 3','4790','Lillesand','false','true','member'),
    ('Beate Barneki','beate.barneki@lmk.no','90000007','https://img.lmk.no/u/beate.barneki.jpg','80000000007','1995','1995-02-22','Barkeveien 12','4790','Lillesand','false','true','member'),
    ('Beate Barnekirke','beate.barnekirke@lmk.no','84077876','https://img.lmk.no/u/beate.barnekirke.jpg','80000000008','1970','1970-10-23','Strandgata 33','4790','Lillesand','false','true','member'),
    ('Benny Barneki','benny.barneki@lmk.no','90000009','https://img.lmk.no/u/benny.barneki.jpg','80000000009','1990','1990-10-10','Barkeveien 14','4790','Lillesand','false','true','member'),
    ('Benny Barnekirke','benny.barnekirke@lmk.no','96780250','https://img.lmk.no/u/benny.barnekirke.jpg','80000000010','2016','2016-02-03','Skoleveien 15','4790','Lillesand','false','true','member'),
    ('Bjarne Bilde','bjarne.bilde@lmk.no','99601026','https://img.lmk.no/u/bjarne.bilde.jpg','80000000011','1968','1968-04-04','Museumsveien 6','4790','Lillesand','false','true','member'),
    ('Bjørn Dahl','bj.rn.dahl@lmk.no','90000012','https://img.lmk.no/u/bj.rn.dahl.jpg','80000000012','1973','1973-12-19','Skogveien 7','4790','Lillesand','false','true','member'),
    ('Bjørn Kristiansen','bj.rn.kristiansen@lmk.no','90000013','https://img.lmk.no/u/bj.rn.kristiansen.jpg','80000000013','1981','1981-06-27','Fjordveien 9','4790','Lillesand','false','true','member'),
    ('Erik Haugen','erik.haugen@lmk.no','90000014','https://img.lmk.no/u/erik.haugen.jpg','80000000014','1984','1984-01-08','Øvre gate 11','4790','Lillesand','false','true','member'),
    ('Frida Forbønn','frida.forbønn@lmk.no','45469479','https://img.lmk.no/u/frida.forb.nn.jpg','80000000015','1998','1998-02-14','Kirkeveien 15','4790','Lillesand','false','true','member'),
    ('Geir Eriksen','geir.eriksen@lmk.no','90000016','https://img.lmk.no/u/geir.eriksen.jpg','80000000016','1970','1970-05-03','Nedre gate 13','4790','Lillesand','false','true','member'),
    ('Geir Moe','geir.moe@lmk.no','90000017','https://img.lmk.no/u/geir.moe.jpg','80000000017','1976','1976-09-21','Bakkeveien 17','4790','Lillesand','false','true','member'),
    ('Hanne Andersen','hanne.andersen@lmk.no','90000018','https://img.lmk.no/u/hanne.andersen.jpg','80000000018','1989','1989-08-09','Solveien 20','4790','Lillesand','false','true','member'),
    ('Hanne Haugland','hanne.haugland@lmk.no','90000019','https://img.lmk.no/u/hanne.haugland.jpg','80000000019','1993','1993-04-25','Lia 5','4790','Lillesand','false','true','member'),
    ('Henriette','henriette@lmk.no','90000020','https://img.lmk.no/u/henriette.jpg','80000000020','2000','2000-12-12','Sentrumsgata 1','4790','Lillesand','false','true','member'),
    ('Henrik Nilsen','henrik.nilsen@lmk.no','90000021','https://img.lmk.no/u/henrik.nilsen.jpg','80000000021','1987','1987-06-06','Torvet 3','4790','Lillesand','false','true','member'),
    ('Jan Kristiansen','jan.kristiansen@lmk.no','90000022','https://img.lmk.no/u/jan.kristiansen.jpg','80000000022','1979','1979-03-17','Bruveien 2','4790','Lillesand','false','true','member'),
    ('Kari Berg','kari.berg@lmk.no','90000023','https://img.lmk.no/u/kari.berg.jpg','80000000023','1983','1983-02-28','Klippeveien 4','4790','Lillesand','false','true','member'),
    ('Kari Sandvik','kari.sandvik@lmk.no','90000024','https://img.lmk.no/u/kari.sandvik.jpg','80000000024','1991','1991-11-11','Sandveien 8','4790','Lillesand','false','true','member'),
    ('Karl Furubakk','karl.furubakk@lmk.no','90000025','https://img.lmk.no/u/karl.furubakk.jpg','80000000025','1986','1986-07-02','Furustien 10','4790','Lillesand','false','true','member'),
    ('Kristin Larsen','kristin.larsen@lmk.no','90000026','https://img.lmk.no/u/kristin.larsen.jpg','80000000026','1994','1994-05-24','Myra 6','4790','Lillesand','false','true','member'),
    ('Lars Lyd','lars.lyd@lmk.no','81456949','https://img.lmk.no/u/lars.lyd.jpg','80000000027','1972','1972-09-13','Musikkveien 1','4790','Lillesand','false','true','member'),
    ('Lars Moe','lars.moe@lmk.no','90000028','https://img.lmk.no/u/lars.moe.jpg','80000000028','1980','1980-10-07','Engveien 5','4790','Lillesand','false','true','member'),
    ('Lille-Lise Jr.','lille-lise.jr.@lmk.no','48654582','https://img.lmk.no/u/lille.lise.jr.jpg','80000000029','2015','2015-05-20','Småveien 3','4790','Lillesand','false','true','member'),
    ('Lise Johansen','lise.johansen@lmk.no','90000030','https://img.lmk.no/u/lise.johansen.jpg','80000000030','1988','1988-01-16','Nordveien 12','4790','Lillesand','false','true','member'),
    ('Lise Lovsang','lise.lovsang@lmk.no','92136857','https://img.lmk.no/u/lise.lovsang.jpg','80000000031','1992','1992-12-04','Korveien 7','4790','Lillesand','false','true','member'),
    ('Lise Sørensen','lise.s.rensen@lmk.no','90000032','https://img.lmk.no/u/lise.s.rensen.jpg','80000000032','1985','1985-08-22','Sørveien 9','4790','Lillesand','false','true','member'),
    ('Lukas Lovsang','lukas.lovsang@lmk.no','47550168','https://img.lmk.no/u/lukas.lovsang.jpg','80000000033','1995','1995-05-05','Korveien 9','4790','Lillesand','false','true','member'),
    ('Magnus Jensen','magnus.jensen@lmk.no','90000034','https://img.lmk.no/u/magnus.jensen.jpg','80000000034','1983','1983-06-18','Vestveien 14','4790','Lillesand','false','true','member'),
    ('Magnus Kristian','magnus.kristian@lmk.no','90000035','https://img.lmk.no/u/magnus.kristian.jpg','80000000035','1981','1981-03-29','Østveien 11','4790','Lillesand','false','true','member'),
    ('Marit Strand','marit.strand@lmk.no','90000036','https://img.lmk.no/u/marit.strand.jpg','80000000036','1977','1977-11-03','Strandpromenaden 4','4790','Lillesand','false','true','member'),
    ('Marit Vik','marit.vik@lmk.no','90000037','https://img.lmk.no/u/marit.vik.jpg','80000000037','1984','1984-07-14','Vika 2','4790','Lillesand','false','true','member'),
    ('Marius Møteveit','marius.m.teveit@lmk.no','90000038','https://img.lmk.no/u/marius.m.teveit.jpg','80000000038','1990','1990-09-26','Møteveien 1','4790','Lillesand','false','true','member'),
    ('Marius Møtevert','marius.møtevert@lmk.no','99625381','https://img.lmk.no/u/marius.m.tevert.jpg','80000000039','2014','2014-06-14','Storgaten 34','4876','Grimstad','false','true','member'),
    ('Marte Johansen','marte.johansen@lmk.no','90000040','https://img.lmk.no/u/marte.johansen.jpg','80000000040','1996','1996-02-10','Elveveien 8','4790','Lillesand','false','true','member'),
    ('Marte Lunde','marte.lunde@lmk.no','90000041','https://img.lmk.no/u/marte.lunde.jpg','80000000041','1989','1989-08-31','Lundveien 13','4790','Lillesand','false','true','member'),
    ('Martin Bakke','martin.bakke@lmk.no','90000042','https://img.lmk.no/u/martin.bakke.jpg','80000000042','1982','1982-04-19','Bakken 4','4790','Lillesand','false','true','member'),
    ('Mats Knutsen','mats.knutsen@lmk.no','90000043','https://img.lmk.no/u/mats.knutsen.jpg','80000000043','1987','1987-12-07','Toppen 6','4790','Lillesand','false','true','member'),
    ('Mats Møteveit','mats.m.teveit@lmk.no','90000044','https://img.lmk.no/u/mats.m.teveit.jpg','80000000044','1993','1993-01-12','Møteveien 3','4790','Lillesand','false','true','member'),
    ('Mats Møtevert','mats.møtevert@lmk.no','81516123','https://img.lmk.no/u/mats.m.tevert.jpg','80000000045','2020','2020-07-14','Storgata 42','4790','Lillesand','false','true','member'),
    ('Mette Fredriks','mette.fredriks@lmk.no','90000046','https://img.lmk.no/u/mette.fredriks.jpg','80000000046','1979','1979-10-28','Dalveien 15','4790','Lillesand','false','true','member'),
    ('Mille Møteveit','mille.m.teveit@lmk.no','90000047','https://img.lmk.no/u/mille.m.teveit.jpg','80000000047','1998','1998-05-15','Møteveien 5','4790','Lillesand','false','true','member'),
    ('Mille Møtevert','mille.møtevert@lmk.no','87941520','https://img.lmk.no/u/mille.m.tevert.jpg','80000000048','2023','2023-09-18','Strandgata 39','4790','Lillesand','false','true','member'),
    ('Morten Møteveit','morten.m.teveit@lmk.no','90000049','https://img.lmk.no/u/morten.m.teveit.jpg','80000000049','1991','1991-06-01','Møteveien 7','4790','Lillesand','false','true','member'),
    ('Morten Møtevert','morten.møtevert@lmk.no','83861763','https://img.lmk.no/u/morten.m.tevert.jpg','80000000050','1994','1994-12-28','Tveideveien 17','4760','Birkeland','false','true','member'),
    ('Nina Sørensen','nina.s.rensen@lmk.no','90000051','https://img.lmk.no/u/nina.s.rensen.jpg','80000000051','1986','1986-03-23','Åsen 2','4790','Lillesand','false','true','member'),
    ('Ole Holm','ole.holm@lmk.no','90000052','https://img.lmk.no/u/ole.holm.jpg','80000000052','1974','1974-09-04','Holmen 1','4790','Lillesand','false','true','member'),
    ('Ole Lie','ole.lie@lmk.no','90000053','https://img.lmk.no/u/ole.lie.jpg','80000000053','1980','1980-11-17','Lien 3','4790','Lillesand','false','true','member'),
    ('Ole Myklebust','ole.myklebust@lmk.no','90000054','https://img.lmk.no/u/ole.myklebust.jpg','80000000054','1983','1983-12-29','Myra 10','4790','Lillesand','false','true','member'),
    ('Ole Solberg','ole.solberg@lmk.no','90000055','https://img.lmk.no/u/ole.solberg.jpg','80000000055','1978','1978-08-08','Berget 5','4790','Lillesand','false','true','member'),
    ('Per Pastor','per.pastor@lmk.no','90000056','https://img.lmk.no/u/per.pastor.jpg','80000000056','1965','1965-05-14','Kirkegata 12','4790','Lillesand','false','true','pastor'),
    ('Silje Lie','silje.lie@lmk.no','90000057','https://img.lmk.no/u/silje.lie.jpg','80000000057','1992','1992-02-20','Lien 5','4790','Lillesand','false','true','member'),
    ('Silje Olsen','silje.olsen@lmk.no','90000058','https://img.lmk.no/u/silje.olsen.jpg','80000000058','1989','1989-07-11','Blomsterveien 4','4790','Lillesand','false','true','member'),
    ('Siri Haugland','siri.haugland@lmk.no','90000059','https://img.lmk.no/u/siri.haugland.jpg','80000000059','1994','1994-01-05','Utsikten 2','4790','Lillesand','false','true','member')
  ) as v(
    name, email, phone, image_url, social_security_number,
    birth_year, birth_date, street_address, postal_code, city,
    is_admin, is_active, core_role
  )
),
typed_incoming as (
  select
    name,
    email,
    phone,
    image_url,
    social_security_number,
    birth_year::int as birth_year,
    birth_date::date as birth_date,
    street_address,
    postal_code,
    city,
    is_admin::boolean as is_admin,
    is_active::boolean as is_active,
    core_role::core_role as core_role
  from incoming
),
cleared as (
  delete from persons
)
insert into persons (
  id, name, email, phone, image_url, social_security_number,
  birth_year, birth_date, street_address, postal_code, city,
  is_admin, is_active, core_role
)
select
  gen_random_uuid(), name, email, phone, image_url, social_security_number,
  birth_year, birth_date, street_address, postal_code, city,
  is_admin, is_active, core_role
from typed_incoming;

commit;
